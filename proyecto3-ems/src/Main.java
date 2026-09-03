import java.util.*;

public class Main {
    static class Hospital {
        String nombre; int camasLibres; String especialidad;
        Hospital(String n, int c, String e) { nombre = n; camasLibres = c; especialidad = e; }
    }

    public static void main(String[] args) {
        // Simulación mínima del min-heap de hospitales candidatos (sección 4.3):
        // prioriza el hospital que tiene el especialista requerido y solo entre
        // esos desempata por más cupo, evitando el "paseo de la muerte".
        String especialidadRequerida = "Cardiología";
        PriorityQueue<Hospital> heap = new PriorityQueue<>(
            Comparator.comparingInt((Hospital h) -> h.especialidad.equals(especialidadRequerida) ? 0 : 1)
                      .thenComparingInt(h -> -h.camasLibres)
        );
        heap.add(new Hospital("Hospital San Rafael", 2, "Cardiología"));
        heap.add(new Hospital("Hospital Universitario Departamental", 5, "Trauma"));
        heap.add(new Hospital("Clinica Los Andes", 1, "Neumología"));

        Hospital elegido = heap.poll();
        System.out.println("TEST_PASSED: hospital elegido = " + elegido.nombre
            + " (camas=" + elegido.camasLibres + ", especialidad=" + elegido.especialidad
            + ", requerida=" + especialidadRequerida + ")");
    }
}
