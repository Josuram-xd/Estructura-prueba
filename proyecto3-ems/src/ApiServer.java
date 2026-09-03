import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;

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

    static final List<Hospital> hospitales = new ArrayList<>();
    static double[][] waypoints;
    static int wpIndex = 0;
    static double segT = 0.0;
    static double ambLat, ambLng;
    static int tick = 0;
    static Hospital toggled = null;

    public static void main(String[] args) throws IOException {
        hospitales.add(new Hospital("Hospital Universitario Departamental", -1.2136, -77.2811, 5, true));
        hospitales.add(new Hospital("Hospital San Rafael", -1.2050, -77.2750, 2, false));
        hospitales.add(new Hospital("Clinica Los Andes", -1.2200, -77.2850, 1, true));

        waypoints = new double[][] {
            {-1.2170, -77.2900},
            {-1.2100, -77.2700},
            {-1.2230, -77.2780}
        };
        ambLat = waypoints[0][0];
        ambLng = waypoints[0][1];

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
            try { Thread.sleep(2000); } catch (InterruptedException e) { return; }
            tick++;
            advanceAmbulance();
            if (tick % 8 == 0) {
                toggleHospital();
            }
        }
    }

    static synchronized void advanceAmbulance() {
        double step = 0.15;
        segT += step;
        int nextIndex = (wpIndex + 1) % waypoints.length;
        if (segT >= 1.0) {
            segT = 0.0;
            wpIndex = nextIndex;
            nextIndex = (wpIndex + 1) % waypoints.length;
        }
        double[] a = waypoints[wpIndex];
        double[] b = waypoints[nextIndex];
        ambLat = a[0] + (b[0] - a[0]) * segT;
        ambLng = a[1] + (b[1] - a[1]) * segT;
    }

    static synchronized void toggleHospital() {
        if (toggled == null) {
            toggled = hospitales.get(1);
            toggled.camasLibres = 0;
        } else {
            toggled.camasLibres = toggled.camasLibresBase;
            toggled = null;
        }
    }

    // Mismo criterio de comparacion que Main.java (especialista primero, luego mas camas),
    // pero solo entre hospitales con cupo real disponible.
    static synchronized Hospital elegirHospital() {
        PriorityQueue<Hospital> heap = new PriorityQueue<>(
            Comparator.comparingInt((Hospital h) -> h.tieneEspecialista ? 0 : 1)
                      .thenComparingInt(h -> -h.camasLibres)
        );
        for (Hospital h : hospitales) {
            if (h.camasLibres > 0) heap.add(h);
        }
        return heap.isEmpty() ? null : heap.poll();
    }

    static void handleState(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Content-Type", "application/json");

        Hospital elegido;
        double lat, lng;
        synchronized (ApiServer.class) {
            elegido = elegirHospital();
            lat = ambLat;
            lng = ambLng;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"ambulancia\":{\"lat\":").append(lat).append(",\"lng\":").append(lng).append("},");
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
        sb.append("\"hospitalElegido\":").append(elegido == null ? "null" : "\"" + escape(elegido.nombre) + "\"");
        sb.append("}");

        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(200, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    static String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
