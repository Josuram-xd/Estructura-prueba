import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;

// Simulación de coordinación de emergencias unificada (evita el "paseo de la muerte"):
// 1) un min-heap ordena las ambulancias disponibles por distancia (la más cercana responde),
// 2) una IA de reglas (guía de primeros auxilios) le indica al paramédico el siguiente paso
//    del protocolo según el tipo de caso, y cada paso queda registrado en un FIFO clínico,
// 3) un min-heap rankea los hospitales candidatos por score (especialista requerido +
//    cupo disponible + distancia) para elegir destino sin depender de llamadas de confirmación,
// 4) el resumen clínico (FIFO) se envía al hospital elegido apenas se asigna, antes de que
//    la ambulancia llegue físicamente, para que el médico receptor sepa qué se hizo en ruta.
public class ApiServer {

    static class Hospital {
        String nombre;
        double lat, lng;
        int camasLibres;
        int camasLibresBase;
        String especialidad; // especialidad principal disponible en este hospital

        Hospital(String nombre, double lat, double lng, int camasLibres, String especialidad) {
            this.nombre = nombre;
            this.lat = lat;
            this.lng = lng;
            this.camasLibres = camasLibres;
            this.camasLibresBase = camasLibres;
            this.especialidad = especialidad;
        }

        String estado() {
            return camasLibres > 0 ? "disponible" : "sin_cupo";
        }
    }

    static class Ambulancia {
        String id, nombre;
        double lat, lng;
        double targetLat, targetLng;
        // disponible | hacia_accidente | en_escena | en_escena_esperando_hospital | hacia_hospital
        String estado = "disponible";
        String hospitalDestino = null;

        Ambulancia(String id, String nombre, double lat, double lng) {
            this.id = id;
            this.nombre = nombre;
            this.lat = lat;
            this.lng = lng;
            this.targetLat = lat;
            this.targetLng = lng;
        }
    }

    // Protocolos de primeros auxilios (guía asistida, tipo checklist que avanza solo,
    // basado en referencias estándar como las guías de la American Heart Association).
    static final Map<String, String[]> PROTOCOLOS = new LinkedHashMap<>();
    static {
        PROTOCOLOS.put("Trauma", new String[]{
            "Verificar vía aérea permeable",
            "Controlar sangrado activo con presión directa",
            "Inmovilizar cuello y columna",
            "Canalizar vía IV",
            "Monitorizar signos vitales",
        });
        PROTOCOLOS.put("Cardiología", new String[]{
            "Evaluar consciencia y pulso",
            "Administrar oxígeno (SatO2 < 94%)",
            "Conectar monitor/desfibrilador",
            "Administrar aspirina (sin contraindicación)",
            "Monitorizar ritmo cardiaco",
        });
        PROTOCOLOS.put("Neumología", new String[]{
            "Sentar en posición semi-Fowler",
            "Administrar oxígeno suplementario",
            "Evaluar frecuencia respiratoria",
            "Preparar nebulización si aplica",
            "Monitorizar SatO2 continuamente",
        });
    }
    static final String[] ESPECIALIDADES = PROTOCOLOS.keySet().toArray(new String[0]);

    static class Accidente {
        double lat, lng;
        // esperando_ambulancia | en_camino | esperando_hospital | trasladando | resuelto
        String estado = "esperando_ambulancia";
        String ambulanciaId = null;
        String hospitalDestino = null;
        String especialistaRequerido;
        String[] guiaPasos;
        int pasoActual = 0;
        final List<String> resumenClinico = new ArrayList<>(); // FIFO de procedimientos realizados

        Accidente(double lat, double lng, String especialistaRequerido) {
            this.lat = lat;
            this.lng = lng;
            this.especialistaRequerido = especialistaRequerido;
            this.guiaPasos = PROTOCOLOS.get(especialistaRequerido);
        }

        String siguientePaso() {
            return pasoActual < guiaPasos.length ? guiaPasos[pasoActual] : null;
        }
    }

    static final List<Hospital> hospitales = new ArrayList<>();
    static final List<Ambulancia> ambulancias = new ArrayList<>();
    static final Deque<String> eventos = new ArrayDeque<>();
    static final Random rng = new Random();

    static Accidente accidenteActual = null;
    static int tick = 0;
    static int cooldownRestante = 2;

    static final double STEP = 0.0035; // grados por tick (~1.5s)
    static final double LAT_MIN = 1.198, LAT_MAX = 1.226;
    static final double LNG_MIN = -77.298, LNG_MAX = -77.268;

    public static void main(String[] args) throws IOException {
        hospitales.add(new Hospital("Hospital Universitario Departamental", 1.2136, -77.2811, 5, "Trauma"));
        hospitales.add(new Hospital("Hospital San Rafael", 1.2050, -77.2750, 2, "Cardiología"));
        hospitales.add(new Hospital("Clinica Los Andes", 1.2200, -77.2850, 1, "Neumología"));

        ambulancias.add(new Ambulancia("A1", "Ambulancia 1", 1.1990, -77.2950));
        ambulancias.add(new Ambulancia("A2", "Ambulancia 2", 1.2250, -77.2660));
        ambulancias.add(new Ambulancia("A3", "Ambulancia 3", 1.2060, -77.2950));
        ambulancias.add(new Ambulancia("A4", "Ambulancia 4", 1.2250, -77.2900));

        log("Sistema iniciado con " + ambulancias.size() + " ambulancias y " + hospitales.size() + " hospitales");

        Thread simThread = new Thread(ApiServer::simLoop);
        simThread.setDaemon(true);
        simThread.start();

        HttpServer server = HttpServer.create(new InetSocketAddress(8082), 0);
        server.createContext("/api/state", ApiServer::handleState);
        server.setExecutor(null);
        server.start();
        System.out.println("ApiServer escuchando en http://localhost:8082/api/state");
    }

    static void simLoop() {
        while (true) {
            try { Thread.sleep(1500); } catch (InterruptedException e) { return; }
            tick();
        }
    }

    static synchronized void tick() {
        tick++;

        for (Ambulancia a : ambulancias) {
            if (a.estado.equals("hacia_accidente") || a.estado.equals("hacia_hospital")) {
                if (moveTowards(a)) handleArrival(a);
            }
        }

        avanzarGuiaPrimerosAuxilios();

        if (accidenteActual == null || accidenteActual.estado.equals("resuelto")) {
            if (cooldownRestante > 0) {
                cooldownRestante--;
            } else {
                spawnAccidente();
                cooldownRestante = 5;
            }
        }

        if (accidenteActual != null && accidenteActual.ambulanciaId == null) {
            asignarAmbulanciaMasCercana();
        }

        for (Ambulancia a : ambulancias) {
            if (a.estado.equals("en_escena_esperando_hospital")) {
                intentarAsignarHospital(a);
            }
        }

        if (tick % 5 == 0) descargarPacienteAleatorio();
    }

    static double distancia(double lat1, double lng1, double lat2, double lng2) {
        return Math.hypot(lat1 - lat2, lng1 - lng2);
    }

    // true si llegó al destino
    static boolean moveTowards(Ambulancia a) {
        double dLat = a.targetLat - a.lat;
        double dLng = a.targetLng - a.lng;
        double dist = Math.hypot(dLat, dLng);
        if (dist <= STEP) {
            a.lat = a.targetLat;
            a.lng = a.targetLng;
            return true;
        }
        a.lat += dLat / dist * STEP;
        a.lng += dLng / dist * STEP;
        return false;
    }

    static void handleArrival(Ambulancia a) {
        if (a.estado.equals("hacia_accidente")) {
            a.estado = "en_escena";
            log(a.nombre + " llegó a la escena del accidente");
            intentarAsignarHospital(a);
        } else if (a.estado.equals("hacia_hospital")) {
            Hospital h = buscarHospital(a.hospitalDestino);
            if (h != null && h.camasLibres > 0) h.camasLibres--;
            log(a.nombre + " entregó al paciente en " + (h == null ? a.hospitalDestino : h.nombre)
                + " — historial ya estaba en poder del médico receptor");
            a.estado = "disponible";
            a.hospitalDestino = null;
            if (accidenteActual != null && a.id.equals(accidenteActual.ambulanciaId)) {
                accidenteActual.estado = "resuelto";
            }
        }
    }

    // Min-heap por distancia: la ambulancia disponible más cercana al accidente responde
    // (minimiza el tiempo de llegada en lugar de despachar por orden de turno).
    static void asignarAmbulanciaMasCercana() {
        final double aLat = accidenteActual.lat, aLng = accidenteActual.lng;
        PriorityQueue<Ambulancia> heap = new PriorityQueue<>(
            Comparator.comparingDouble(a -> distancia(a.lat, a.lng, aLat, aLng))
        );
        for (Ambulancia a : ambulancias) {
            if (a.estado.equals("disponible")) heap.add(a);
        }
        if (heap.isEmpty()) return;

        Ambulancia elegida = heap.poll();
        elegida.estado = "hacia_accidente";
        elegida.targetLat = aLat;
        elegida.targetLng = aLng;
        accidenteActual.ambulanciaId = elegida.id;
        accidenteActual.estado = "en_camino";
        log(elegida.nombre + " asignada al accidente (más cercana disponible)");
    }

    // Guía de primeros auxilios asistida: un checklist basado en el tipo de caso avanza solo,
    // un paso por tick, mientras el paciente está en manos del paramédico. Cada paso realizado
    // se encola en el resumen clínico (FIFO) que ya viaja hacia el hospital elegido.
    static void avanzarGuiaPrimerosAuxilios() {
        if (accidenteActual == null) return;
        Accidente ac = accidenteActual;
        if (ac.ambulanciaId == null) return;
        boolean pacienteEnAtencion = ac.estado.equals("en_camino") || ac.estado.equals("esperando_hospital")
            || ac.estado.equals("trasladando");
        if (!pacienteEnAtencion) return;

        String paso = ac.siguientePaso();
        if (paso == null) return;

        ac.pasoActual++;
        ac.resumenClinico.add(paso);
        Ambulancia a = buscarAmbulancia(ac.ambulanciaId);
        String nombreAmb = a != null ? a.nombre : ac.ambulanciaId;
        log("IA sugiere a " + nombreAmb + ": " + paso);
    }

    // Min-heap por score de idoneidad: prioriza el hospital que tenga el especialista requerido
    // Y cupo disponible sobre el simplemente más cercano — así se evita el "paseo de la muerte"
    // (llegar a un hospital y que toque redirigir a otro porque no puede recibir al paciente).
    static void intentarAsignarHospital(Ambulancia a) {
        final String especialidadReq = accidenteActual != null ? accidenteActual.especialistaRequerido : null;
        PriorityQueue<Hospital> heap = new PriorityQueue<>(
            Comparator.<Hospital>comparingInt(h -> h.especialidad.equals(especialidadReq) ? 0 : 1)
                      .thenComparingDouble(h -> distancia(a.lat, a.lng, h.lat, h.lng))
        );
        for (Hospital h : hospitales) {
            if (h.camasLibres > 0) heap.add(h);
        }
        if (heap.isEmpty()) {
            a.estado = "en_escena_esperando_hospital";
            if (accidenteActual != null) accidenteActual.estado = "esperando_hospital";
            return;
        }

        Hospital elegido = heap.poll();
        boolean tieneEspecialista = elegido.especialidad.equals(especialidadReq);
        a.estado = "hacia_hospital";
        a.targetLat = elegido.lat;
        a.targetLng = elegido.lng;
        a.hospitalDestino = elegido.nombre;
        if (accidenteActual != null) {
            accidenteActual.estado = "trasladando";
            accidenteActual.hospitalDestino = elegido.nombre;
        }
        log(a.nombre + " traslada al paciente a " + elegido.nombre
            + (tieneEspecialista ? " (tiene " + especialidadReq + " y cupo)" : " (más cercano con cupo; sin " + especialidadReq + ")")
            + " — notificación anticipada con resumen clínico enviada");
    }

    static void spawnAccidente() {
        double lat = LAT_MIN + rng.nextDouble() * (LAT_MAX - LAT_MIN);
        double lng = LNG_MIN + rng.nextDouble() * (LNG_MAX - LNG_MIN);
        String especialidad = ESPECIALIDADES[rng.nextInt(ESPECIALIDADES.length)];
        accidenteActual = new Accidente(lat, lng, especialidad);
        log("Nuevo accidente reportado — requiere " + especialidad);
    }

    static void descargarPacienteAleatorio() {
        List<Hospital> conCupoOcupado = new ArrayList<>();
        for (Hospital h : hospitales) {
            if (h.camasLibres < h.camasLibresBase) conCupoOcupado.add(h);
        }
        if (conCupoOcupado.isEmpty()) return;
        Hospital h = conCupoOcupado.get(rng.nextInt(conCupoOcupado.size()));
        h.camasLibres++;
        log("Paciente dado de alta en " + h.nombre + " (cupo liberado)");
    }

    static Hospital buscarHospital(String nombre) {
        for (Hospital h : hospitales) if (h.nombre.equals(nombre)) return h;
        return null;
    }

    static Ambulancia buscarAmbulancia(String id) {
        for (Ambulancia a : ambulancias) if (a.id.equals(id)) return a;
        return null;
    }

    static void log(String msg) {
        eventos.addFirst("[t" + tick + "] " + msg);
        while (eventos.size() > 20) eventos.removeLast();
    }

    static void handleState(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Content-Type", "application/json");

        String body;
        synchronized (ApiServer.class) {
            body = serializarEstado();
        }

        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    static String serializarEstado() {
        StringBuilder sb = new StringBuilder();
        sb.append("{");

        sb.append("\"tick\":").append(tick).append(",");

        sb.append("\"hospitales\":[");
        for (int i = 0; i < hospitales.size(); i++) {
            Hospital h = hospitales.get(i);
            if (i > 0) sb.append(",");
            sb.append("{")
              .append("\"nombre\":\"").append(escape(h.nombre)).append("\",")
              .append("\"lat\":").append(h.lat).append(",")
              .append("\"lng\":").append(h.lng).append(",")
              .append("\"camasLibres\":").append(h.camasLibres).append(",")
              .append("\"especialidad\":\"").append(escape(h.especialidad)).append("\",")
              .append("\"estado\":\"").append(h.estado()).append("\"")
              .append("}");
        }
        sb.append("],");

        sb.append("\"ambulancias\":[");
        for (int i = 0; i < ambulancias.size(); i++) {
            Ambulancia a = ambulancias.get(i);
            if (i > 0) sb.append(",");
            sb.append("{")
              .append("\"id\":\"").append(escape(a.id)).append("\",")
              .append("\"nombre\":\"").append(escape(a.nombre)).append("\",")
              .append("\"lat\":").append(a.lat).append(",")
              .append("\"lng\":").append(a.lng).append(",")
              .append("\"estado\":\"").append(a.estado).append("\",")
              .append("\"hospitalDestino\":").append(a.hospitalDestino == null ? "null" : "\"" + escape(a.hospitalDestino) + "\"")
              .append("}");
        }
        sb.append("],");

        sb.append("\"accidente\":");
        if (accidenteActual == null) {
            sb.append("null");
        } else {
            Accidente ac = accidenteActual;
            String siguientePaso = ac.siguientePaso();
            sb.append("{")
              .append("\"lat\":").append(ac.lat).append(",")
              .append("\"lng\":").append(ac.lng).append(",")
              .append("\"estado\":\"").append(ac.estado).append("\",")
              .append("\"ambulanciaId\":").append(ac.ambulanciaId == null ? "null" : "\"" + escape(ac.ambulanciaId) + "\"").append(",")
              .append("\"hospitalDestino\":").append(ac.hospitalDestino == null ? "null" : "\"" + escape(ac.hospitalDestino) + "\"").append(",")
              .append("\"especialistaRequerido\":\"").append(escape(ac.especialistaRequerido)).append("\",")
              .append("\"siguientePaso\":").append(siguientePaso == null ? "null" : "\"" + escape(siguientePaso) + "\"").append(",")
              .append("\"guiaPasos\":[");
            for (int i = 0; i < ac.guiaPasos.length; i++) {
                if (i > 0) sb.append(",");
                sb.append("\"").append(escape(ac.guiaPasos[i])).append("\"");
            }
            sb.append("],")
              .append("\"pasoActual\":").append(ac.pasoActual).append(",")
              .append("\"resumenClinico\":[");
            for (int i = 0; i < ac.resumenClinico.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append("\"").append(escape(ac.resumenClinico.get(i))).append("\"");
            }
            sb.append("]")
              .append("}");
        }
        sb.append(",");

        sb.append("\"eventos\":[");
        int i = 0;
        for (String e : eventos) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(escape(e)).append("\"");
            i++;
        }
        sb.append("]");

        sb.append("}");
        return sb.toString();
    }

    static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
