import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;

// Simulación de coordinación de emergencias: cuando se reporta un accidente,
// un min-heap ordena las ambulancias disponibles por distancia (la más cercana
// responde) y, al llegar a la escena, otro min-heap ordena los hospitales con
// cupo disponible por distancia (el más cercano con disponibilidad la recibe).
public class ApiServer {

    static class Hospital {
        String nombre;
        double lat, lng;
        int camasLibres;
        int camasLibresBase;
        boolean tieneEspecialista;

        Hospital(String nombre, double lat, double lng, int camasLibres, boolean tieneEspecialista) {
            this.nombre = nombre;
            this.lat = lat;
            this.lng = lng;
            this.camasLibres = camasLibres;
            this.camasLibresBase = camasLibres;
            this.tieneEspecialista = tieneEspecialista;
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

    static class Accidente {
        double lat, lng;
        // esperando_ambulancia | en_camino | esperando_hospital | trasladando | resuelto
        String estado = "esperando_ambulancia";
        String ambulanciaId = null;
        String hospitalDestino = null;

        Accidente(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
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
        hospitales.add(new Hospital("Hospital Universitario Departamental", 1.2136, -77.2811, 5, true));
        hospitales.add(new Hospital("Hospital San Rafael", 1.2050, -77.2750, 2, false));
        hospitales.add(new Hospital("Clinica Los Andes", 1.2200, -77.2850, 1, true));

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
            log(a.nombre + " entregó al paciente en " + (h == null ? a.hospitalDestino : h.nombre));
            a.estado = "disponible";
            a.hospitalDestino = null;
            if (accidenteActual != null && a.id.equals(accidenteActual.ambulanciaId)) {
                accidenteActual.estado = "resuelto";
            }
        }
    }

    // Min-heap por distancia: la ambulancia disponible más cercana al accidente responde.
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

    // Min-heap por distancia entre los hospitales CON cupo: el más cercano con disponibilidad recibe al paciente.
    static void intentarAsignarHospital(Ambulancia a) {
        PriorityQueue<Hospital> heap = new PriorityQueue<>(
            Comparator.comparingDouble((Hospital h) -> distancia(a.lat, a.lng, h.lat, h.lng))
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
        a.estado = "hacia_hospital";
        a.targetLat = elegido.lat;
        a.targetLng = elegido.lng;
        a.hospitalDestino = elegido.nombre;
        if (accidenteActual != null) {
            accidenteActual.estado = "trasladando";
            accidenteActual.hospitalDestino = elegido.nombre;
        }
        log(a.nombre + " traslada al paciente a " + elegido.nombre + " (más cercano con cupo)");
    }

    static void spawnAccidente() {
        double lat = LAT_MIN + rng.nextDouble() * (LAT_MAX - LAT_MIN);
        double lng = LNG_MIN + rng.nextDouble() * (LNG_MAX - LNG_MIN);
        accidenteActual = new Accidente(lat, lng);
        log("Nuevo accidente reportado");
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
              .append("\"tieneEspecialista\":").append(h.tieneEspecialista).append(",")
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
            sb.append("{")
              .append("\"lat\":").append(accidenteActual.lat).append(",")
              .append("\"lng\":").append(accidenteActual.lng).append(",")
              .append("\"estado\":\"").append(accidenteActual.estado).append("\",")
              .append("\"ambulanciaId\":").append(accidenteActual.ambulanciaId == null ? "null" : "\"" + escape(accidenteActual.ambulanciaId) + "\"").append(",")
              .append("\"hospitalDestino\":").append(accidenteActual.hospitalDestino == null ? "null" : "\"" + escape(accidenteActual.hospitalDestino) + "\"")
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
