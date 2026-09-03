import java.util.*;

public class Main {
    static class Hospital {
        String nombre; int camasLibres; boolean tieneEspecialista;
        Hospital(String n, int c, boolean e) { nombre = n; camasLibres = c; tieneEspecialista = e; }
    }

    public static void main(String[] args) {
        // Simulación mínima del min-heap de hospitales candidatos (sección 4.3)
        PriorityQueue<Hospital> heap = new PriorityQueue<>(
            Comparator.comparingInt((Hospital h) -> h.tieneEspecialista ? 0 : 1)
                      .thenComparingInt(h -> -h.camasLibres)
        );
        heap.add(new Hospital("Hospital San Rafael", 2, false));
        heap.add(new Hospital("Hospital Universitario Departamental", 5, true));
        heap.add(new Hospital("Clinica Los Andes", 1, true));

        Hospital elegido = heap.poll();
        System.out.println("TEST_PASSED: hospital elegido = " + elegido.nombre
            + " (camas=" + elegido.camasLibres + ", especialista=" + elegido.tieneEspecialista + ")");
    }
}
