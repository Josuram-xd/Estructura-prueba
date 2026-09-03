**PROPUESTA TÉCNICA**

**Sistemas Inteligentes en Tiempo Real: Estructuras de Datos +
Inteligencia Artificial + Patrones de Diseño**

**Materia --- Estructuras de Datos**

*Proyecto 1: Balanceo de Carga en Microgrids Solares*

*Proyecto 2: Optimización de Semáforos Inteligentes*

*Proyecto 3: Smart EMS Pasto-Nariño --- Coordinación de Emergencias
Médicas*

**Materia --- Patrones de Diseño (Backend Java)**

*Proyecto 4: Verificación de Asepsia Quirúrgica*

*Proyecto 5: Cazador de Jailbreaks*

Nombre del estudiante:
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Docente: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

Fecha: Septiembre de 2026

**1. Introducción**

Este documento presenta cinco propuestas de proyecto que combinan
estructuras de datos y patrones de diseño con componentes reales de
inteligencia artificial (no conversacional), orientadas a resolver
problemas de asignación de recursos, optimización y coordinación en
tiempo real. Están organizadas por la materia a la que corresponden:
primero los tres proyectos de Estructuras de Datos, y luego los dos
proyectos de Patrones de Diseño (Backend Java).

Todas comparten el mismo enfoque metodológico: modelar el problema con
la estructura o el patrón apropiado, delegar la decisión inteligente a
un modelo de IA (ya sea consumido por API o entrenado específicamente),
y validar el resultado con una simulación controlada --- física con
Arduino/ESP32 cuando aplica, o en software cuando el problema es de
coordinación entre sistemas --- evitando depender de datos de producción
reales o hardware costoso.

  -----------------------------------------------------------------------
  **MATERIA: ESTRUCTURAS DE DATOS**

  -----------------------------------------------------------------------

**2. Proyecto 1 --- Balanceo de Carga en Microgrids Solares**

***Materia: Estructuras de Datos***

**2.1 Problema y justificación**

Las microrredes solares aisladas (sin conexión a la red eléctrica
nacional) son cada vez más comunes en programas de electrificación
rural. Su generación es intermitente por naturaleza --- depende de la
nubosidad y la hora del día --- mientras que la demanda de energía no
espera. Sin un mecanismo de priorización, dispositivos críticos
(refrigeración, comunicaciones, iluminación de emergencia) pueden
quedarse sin energía mientras se reparte de forma pareja o por orden de
llegada a cargas no urgentes. El sistema propuesto prioriza la energía
disponible según urgencia real y anticipa la generación futura para
tomar mejores decisiones.

**2.2 Arquitectura de software**

-   EnergyRequest: estructura que representa cada dispositivo con su
    prioridad, consumo estimado y tiempo de espera.

-   MinHeapScheduler: heap binario implementado manualmente, que ordena
    los dispositivos según un score de urgencia calculado a partir de
    prioridad y tiempo de espera.

-   SolarForecastService: obtiene o calcula la predicción de generación
    solar próxima según nubosidad.

-   DistributionEngine: recalcula el heap periódicamente y decide qué
    dispositivos reciben energía con lo disponible.

-   HardwareBridge: capa de comunicación con el Arduino de la maqueta
    física.

-   API REST + WebSocket: expone el estado del sistema en tiempo real al
    dashboard.

**2.3 Stack tecnológico**

  -------------------------------------------------------------------------
  **Componente**   **Tecnología**             **Por qué**
  ---------------- -------------------------- -----------------------------
  Backend          Node.js 20 + Express +     Problema I/O-bound (consultas
                   TypeScript                 de clima, actualizaciones
                                              frecuentes); más ágil que un
                                              stack empresarial pesado para
                                              este alcance.

  Tiempo real      Socket.io (WebSockets)     Actualiza el dashboard y el
                                              estado del heap sin necesidad
                                              de refrescar o hacer polling.

  Base de datos    PostgreSQL                 Histórico de asignaciones y
                                              métricas para mostrar mejoras
                                              en la sustentación.

  Frontend         React + TypeScript +       Visualización del heap
                   Recharts                   reordenándose y gráficas de
                                              energía disponible vs.
                                              consumida.

  IA               Modelo de regresión        Permite entrenar con datos
                   (scikit-learn) exportado a propios y ejecutar la
                   ONNX                       inferencia embebida en el
                                              backend sin microservicio
                                              adicional.

  Inferencia       onnxruntime-node           Corre el modelo ONNX
                                              directamente en Node.js, sin
                                              dependencias de Python en
                                              producción.
  -------------------------------------------------------------------------

**2.4 Opciones de inteligencia artificial**

  ------------------------------------------------------------------------
  **Opción**             **Descripción**            **Ventaja /
                                                    Limitación**
  ---------------------- -------------------------- ----------------------
  A. Solo API de clima   Consumir directamente el   Rápido de implementar
  (Open-Meteo)           pronóstico de nubosidad    y gratuito; no
                         sin entrenar modelo        requiere dataset.
                         propio.                    Limitación: no
                                                    demuestra trabajo
                                                    propio de
                                                    entrenamiento de IA.

  B. Modelo propio       Regresión entrenada con    Demuestra dominio del
  entrenado              datos históricos de        pipeline de ML
                         irradiancia (NASA POWER o  completo y funciona
                         PVGIS), exportada a ONNX.  incluso sin conexión a
                                                    internet durante la
                                                    demo. Requiere más
                                                    tiempo de desarrollo.
  ------------------------------------------------------------------------

Recomendación: usar la Opción B (modelo propio) como componente
principal a mostrar en la sustentación, con la API de Open-Meteo como
fuente de datos en tiempo real para alimentar o validar el modelo.

**2.5 Fuentes de datos**

  -----------------------------------------------------------------------
  **Fuente**           **Uso**
  -------------------- --------------------------------------------------
  Open-Meteo           Pronóstico de nubosidad en tiempo real, gratuito y
                       sin llave de API.

  NASA POWER API       Series históricas de irradiancia solar para
                       entrenar el modelo de predicción.

  PVGIS (Comisión      Alternativa para estimar generación fotovoltaica
  Europea)             directamente, útil para validar resultados del
                       modelo propio.
  -----------------------------------------------------------------------

**2.6 Simulación física a escala reducida**

La maqueta permite demostrar el sistema en vivo sin depender de una
instalación solar real:

-   Arduino Uno como controlador central de la maqueta.

-   Panel solar pequeño (mini fotovoltaico 5V) como fuente de energía.

-   Sensor LDR para simular nubosidad: al cubrir el panel con la mano o
    un obturador deslizante, el sistema detecta menor disponibilidad de
    energía.

-   Sensor de voltaje/corriente (módulo INA219) para medir energía real
    generada.

-   3 a 4 LED de distinto color representando dispositivos de distinta
    prioridad (rojo = crítico, amarillo = medio, verde = bajo).

-   Relés o transistores MOSFET controlados por Arduino para
    encender/apagar cada LED según la decisión del backend.

-   Batería pequeña recargable (18650 + módulo TP4056) para simular
    almacenamiento intermedio.

Durante la demo: al cubrir el panel (simulando nubes), el heap se
reordena y el sistema apaga primero los LED de menor prioridad,
manteniendo encendido el crítico el mayor tiempo posible --- el efecto
es visible e inmediato para el profesor.

**2.7 Etapas de desarrollo**

  -------------------------------------------------------------------------
  **Semana**   **Actividad**
  ------------ ------------------------------------------------------------
  1            Investigación y definición de reglas de priorización de
               dispositivos.

  2            Diseño de arquitectura y modelo de datos.

  3            Implementación del min-heap y motor de distribución de
               energía.

  4            Entrenamiento del modelo de predicción solar e integración
               vía ONNX.

  5            Armado y programación del circuito Arduino (sensores, LEDs,
               relés).

  6            Integración backend--hardware (comunicación serial/WiFi).

  7            Desarrollo del dashboard frontend en tiempo real.

  8            Pruebas integrales y preparación de la sustentación.
  -------------------------------------------------------------------------

**3. Proyecto 2 --- Optimización de Semáforos Inteligentes**

***Materia: Estructuras de Datos***

**3.1 Problema y justificación**

Los semáforos de tiempo fijo asignan la misma duración de luz verde a
una vía saturada y a una vacía, generando trancones evitables, mayor
consumo de combustible y más emisiones. Modelar la intersección como un
grafo permite representar las relaciones reales entre vías y ajustar los
tiempos de luz según la congestión detectada en cada momento, en lugar
de un horario predefinido.

**3.2 Arquitectura de software**

-   IntersectionGraph: grafo donde cada nodo representa un
    carril/intersección y cada arista el flujo entre ellos, con peso
    proporcional a la congestión.

-   TrafficPriorityQueue: cola de prioridad que decide qué carril recibe
    luz verde primero según su nivel de congestión.

-   CongestionSensorService: recibe las lecturas de los sensores físicos
    que detectan vehículos en cada carril.

-   TrafficPredictor: modelo de IA que decide la duración óptima de la
    luz verde para cada ciclo.

-   SignalController: aplica la decisión y envía el comando al
    controlador físico (ESP32) de la maqueta.

-   API REST + WebSocket: expone el estado del grafo en tiempo real al
    dashboard.

**3.3 Stack tecnológico**

  ------------------------------------------------------------------------
  **Componente**     **Tecnología**              **Por qué**
  ------------------ --------------------------- -------------------------
  Backend            Python 3.11 + FastAPI       Ecosistema natural para
                                                 RL y simulación de
                                                 tráfico; evita
                                                 reimplementar
                                                 herramientas ya maduras
                                                 en otro lenguaje.

  Simulación de      SUMO (Simulation of Urban   Estándar académico para
  tráfico            Mobility) + TraCI           generar tráfico sintético
                                                 realista sin depender de
                                                 cámaras o datos reales.

  IA                 Gymnasium +                 Permite entrenar un
                     Stable-Baselines3           agente que aprende la
                     (PPO/DQN), o                política óptima de
                     alternativamente regresión  tiempos de luz, o una
                     con scikit-learn            alternativa más simple si
                                                 el tiempo es limitado.

  Comunicación con   ESP32 vía WiFi (MQTT o      Evita el cable físico del
  hardware           HTTP)                       Arduino Uno tradicional y
                                                 facilita mover la maqueta
                                                 durante la sustentación.

  Base de datos      SQLite / PostgreSQL         Histórico de tiempos de
                                                 espera, para mostrar la
                                                 mejora frente a tiempo
                                                 fijo.

  Frontend           React + TypeScript +        Visualización del grafo
                     react-flow / D3.js          de la intersección
                                                 cambiando de estado en
                                                 tiempo real.
  ------------------------------------------------------------------------

**3.4 Opciones de inteligencia artificial**

  -------------------------------------------------------------------------
  **Opción**             **Descripción**               **Ventaja /
                                                       Limitación**
  ---------------------- ----------------------------- --------------------
  A. Modelo de           scikit-learn predice el       Simple y rápido de
  predicción/regresión   tiempo óptimo de luz verde    implementar y
                         según el nivel de ocupación   explicar. Menor
                         de cada carril.               capacidad de
                                                       adaptación que un
                                                       agente de RL.

  B. Reinforcement       Agente (PPO/DQN) entrenado en Mucho más robusto y
  Learning (RL)          el entorno simulado de SUMO,  defendible
                         aprende la política que       técnicamente;
                         minimiza el tiempo de espera  requiere más tiempo
                         total.                        de entrenamiento y
                                                       ajuste.
  -------------------------------------------------------------------------

Recomendación: construir primero un MVP funcional con la Opción A
(predicción/regresión) para asegurar una demo estable, y si el
cronograma lo permite, migrar o complementar con la Opción B (RL) como
componente avanzado a destacar.

**3.5 Simulación física a escala reducida**

La maqueta reproduce una intersección de cuatro vías controlada por el
mismo backend que gobernaría un semáforo real:

-   Maqueta de una intersección de 4 vías en cartón, madera o impresión
    3D.

-   Un sensor ultrasónico HC-SR04 por vía, que detecta si hay un carrito
    esperando en el carril.

-   Un set de LED (rojo/amarillo/verde) por vía, simulando el semáforo
    físico.

-   ESP32 como controlador: lee los 4 sensores y envía los datos al
    backend por WiFi.

-   El backend actualiza el grafo y la cola de prioridad, decide qué vía
    tiene luz verde y por cuánto tiempo, y responde al ESP32.

-   Carritos de juguete (o autos a control remoto simple) se desplazan
    por las vías durante la demo para generar el escenario de congestión
    en vivo.

Durante la sustentación: se puede acumular carritos en un carril y
mostrar cómo el sistema le asigna más tiempo de luz verde que a los
carriles vacíos, algo que un semáforo de tiempo fijo no podría hacer.

**3.6 Etapas de desarrollo**

  -------------------------------------------------------------------------
  **Semana**   **Actividad**
  ------------ ------------------------------------------------------------
  1            Investigación, definición del grafo y reglas de prioridad.

  2            Diseño de la arquitectura backend.

  3            Implementación del grafo y la cola de prioridad.

  4            Simulación en SUMO y generación de datos / entrenamiento del
               modelo.

  5            Armado de la maqueta física (sensores, LED, ESP32).

  6            Integración backend--hardware (comunicación WiFi).

  7            Desarrollo del dashboard con el grafo en tiempo real.

  8            Pruebas integrales con los carritos físicos.

  9            Ajustes finales y preparación de la sustentación.
  -------------------------------------------------------------------------

**4. Proyecto 3 --- Smart EMS Pasto-Nariño (Coordinación de Emergencias
Médicas)**

***Materia: Estructuras de Datos***

*Nota: esta es la versión unificada del sistema de coordinación de
emergencias --- las dos versiones anteriores (una centrada en el
algoritmo espacial y otra inspirada en el sistema coreano \"Smart EMS
119 & CONNECT-AI\") describían el mismo sistema, así que se fusionaron
en un solo proyecto dentro de Estructuras de Datos.*

**4.1 Problema y justificación**

El \"paseo de la muerte\" ocurre cuando una ambulancia lleva a un
paciente a un hospital que no tiene el especialista o la capacidad para
recibirlo, obligando a trasladarlo a otro centro y perdiendo minutos
críticos que en emergencias (trauma, infarto, ACV) determinan la
diferencia entre vida y muerte. En Pasto y el resto de Nariño esto se
agrava por la geografía: muchas veredas y municipios están a varias
horas de la ciudad por vías de montaña, y la red de urgencias
---Hospital Universitario Departamental de Nariño, Hospital San Rafael,
Hospital Civil, clínicas privadas como Clínica Hispanoamérica o Clínica
Los Andes--- no comparte hoy visibilidad en tiempo real de cupos,
especialistas ni disponibilidad entre sí. El sistema propuesto resuelve
tres problemas encadenados: (1) encontrar la ambulancia más cercana al
lugar del accidente, (2) encontrar y contactar por adelantado al
hospital que realmente puede recibir al paciente ---no solo el más
cercano---, y (3) transferir al médico receptor un resumen de lo
realizado durante el traslado (procedimientos, medicamentos, signos
vitales) para dar continuidad a la atención.

**4.2 Qué hace el sistema**

-   Guía de reanimación paso a paso: sugiere al paramédico la siguiente
    acción según el protocolo estándar de primeros auxilios y soporte
    vital básico/avanzado, a partir de los signos vitales y el tipo de
    caso reportado --- no es un chat, es un checklist que avanza solo.

-   Pre-triage por video: una cámara dentro de la ambulancia evalúa
    automáticamente indicadores visibles de severidad (nivel de
    consciencia aparente, sangrado visible, color de piel) y transmite
    video en vivo al centro de control y al hospital receptor.

-   Elección del hospital óptimo: cruza la ubicación GPS de la
    ambulancia, el estado del tráfico, y la disponibilidad en tiempo
    real de camas, quirófanos y especialistas en los hospitales
    cercanos, para asignar destino sin depender de llamadas telefónicas
    de confirmación.

-   Notificación anticipada y registro automático: transcribe por voz lo
    que reporta el paramédico durante el traslado y genera un historial
    clínico digital que llega a la pantalla del médico receptor antes de
    que el paciente llegue físicamente.

**4.3 Arquitectura de software (estructuras aplicadas)**

-   Grafo de la red vial (nodos = intersecciones/puntos, aristas = vías
    con peso = tiempo estimado de viaje) + A\*/Dijkstra, para calcular
    el tiempo real de llegada de cada ambulancia candidata, no solo la
    distancia en línea recta.

-   Estructura espacial (KD-tree / Quadtree) que indexa la posición en
    tiempo real de todas las ambulancias disponibles, para encontrar
    rápidamente las más cercanas al punto del accidente antes de
    calcular la ruta exacta con el grafo.

-   Min-heap (cola de prioridad) que rankea los hospitales candidatos
    según un score de idoneidad (especialista requerido disponible +
    capacidad/camas libres + tiempo estimado de traslado), eligiendo el
    mejor destino y no solo el más cercano.

-   Hash table para lookup O(1) del estado en tiempo real de cada
    ambulancia (disponible / en ruta / ocupada) y de cada hospital
    (especialistas de turno, camas disponibles, capacidad de UCI).

-   Cola (queue) FIFO que registra secuencialmente los procedimientos
    realizados durante el traslado (RCP, medicamentos, signos vitales),
    transmitida como resumen estructurado al médico receptor antes de la
    llegada.

Con esta combinación, al activarse una emergencia el sistema no solo
despacha la ambulancia más próxima, sino que en paralelo identifica qué
hospitales tienen el especialista y la capacidad requerida, contacta
automáticamente al elegido para confirmar que puede recibir al paciente,
y solo entonces la ambulancia se dirige allí --- rompiendo el ciclo de
\"llegar y ser rechazado\". El backend puede organizarse internamente
con principios de buen diseño (por ejemplo, una capa única que unifique
el acceso a los distintos sensores), pero lo que se evalúa como aporte
central en esta materia es la combinación de estructuras de datos
descrita arriba.

**4.4 Componentes de inteligencia artificial (no chatbot)**

-   Modelo de triage/severidad: clasifica la urgencia del caso a partir
    de los datos reportados por la ambulancia (signos vitales, mecanismo
    de la lesión) para decidir qué especialista se necesita y con qué
    prioridad.

-   Pre-triage por visión: complementa el triage con indicadores
    visuales de severidad detectados por la cámara de la ambulancia,
    cuando esté disponible.

-   Modelo de predicción de tiempo de traslado: ajusta el peso de las
    aristas del grafo en tiempo real según tráfico y hora del día.

-   Guía asistida de procedimientos: reconoce en qué fase del protocolo
    clínico está el paramédico (según las acciones/valores que reporta)
    y sugiere el siguiente paso conforme a protocolos estándar (p. ej.
    guías de RCP de la American Heart Association) --- un checklist
    inteligente que avanza solo, no una conversación abierta.

-   Reconocimiento de voz + extracción de entidades clínicas: transcribe
    automáticamente el reporte verbal del paramédico (medicamento,
    dosis, hora, signo vital mencionado) para generar el historial
    clínico digital.

**4.5 Stack tecnológico**

  ------------------------------------------------------------------------
  **Componente**   **Tecnología**              **Por qué**
  ---------------- --------------------------- ---------------------------
  Backend          Java 17 + Spring Boot       Los hospitales reales
                                               intercambian información
                                               clínica bajo el estándar
                                               HL7 FHIR, y Java cuenta con
                                               la librería más madura para
                                               implementarlo (HAPI FHIR).

  Tiempo real      WebSockets (STOMP sobre     Actualiza en vivo la
                   Spring)                     posición de las
                                               ambulancias, el video y el
                                               estado de los hospitales en
                                               el dashboard.

  Ingesta IoT      Gateway MQTT                Protocolo estándar para los
                                               sensores de la ambulancia
                                               (cámara, GPS, monitor de
                                               signos vitales), funciona
                                               igual sobre 4G o 5G.

  Motor de rutas   OSRM o GraphHopper sobre    Evita reimplementar un
                   datos de OpenStreetMap      motor de rutas desde cero;
                                               calcula tiempos reales de
                                               viaje sobre el grafo vial.

  Visión en la     Modelo ligero               Procesa el video localmente
  ambulancia       (MobileNet/YOLO) en un      para el pre-triage; evita
                   dispositivo edge (Raspberry depender de enviar video
                   Pi / Jetson Nano)           crudo por una red que puede
                                               fallar en zonas rurales de
                                               Nariño.

  Voz a texto      Modelo de reconocimiento de Genera el historial clínico
                   voz en español (ej. Whisper automático sin depender de
                   en modo local) + extracción conexión constante a
                   de entidades clínicas       internet.

  Base de datos    PostgreSQL + PostGIS        Extensión geoespacial que
                                               permite consultas
                                               espaciales eficientes sobre
                                               ubicaciones de ambulancias
                                               y hospitales.

  Frontend         React + TypeScript +        Mapa en tiempo real con
                   Leaflet/Mapbox              ambulancias, hospitales,
                                               video en vivo y ficha
                                               clínica digital.
  ------------------------------------------------------------------------

**4.6 Opciones de inteligencia artificial**

  -----------------------------------------------------------------------
  **Opción**              **Descripción**            **Ventaja /
                                                     Limitación**
  ----------------------- -------------------------- --------------------
  A. Reglas fijas de      Aplicar directamente los   Simple, ya validado
  triage (START/SALT),    protocolos estándar de     clínicamente y fácil
  solo signos vitales     clasificación de víctimas, de desplegar en toda
                          sin modelo entrenado ni    la flota.
                          cámara.                    Limitación: no
                                                     aprende de patrones
                                                     locales ni usa la
                                                     señal visual de
                                                     severidad.

  B. Modelo entrenado de  Clasificación (Random      Pre-triage más
  severidad + visión por  Forest / red neuronal      completo y
  cámara                  simple) que combina signos defendible como
                          vitales con el pre-triage  proyecto de IA.
                          por video, usando los      Limitación: requiere
                          protocolos de la Opción A  dataset etiquetado y
                          como referencia inicial.   una cámara con
                                                     procesamiento edge
                                                     en cada ambulancia.
  -----------------------------------------------------------------------

Recomendación: diseñar el sistema para operar siempre con la Opción A
como mínimo garantizado en toda la flota, y activar la Opción B
automáticamente en las ambulancias que sí cuenten con cámara --- así el
despliegue puede ser gradual sin dejar de funcionar en las unidades más
básicas.

**4.7 Fuentes de datos**

  -----------------------------------------------------------------------
  **Fuente**                 **Uso**
  -------------------------- --------------------------------------------
  Protocolos START / SALT y  Base de reglas de triage y de la guía
  guías de RCP (AHA)         asistida de procedimientos.

  OpenStreetMap (vía         Red vial real de Pasto y municipios cercanos
  OSRM/GraphHopper)          para el grafo de rutas, sin licencias pagas.

  Directorio de hospitales y Modela la red de hospitales y las
  especialidades de Pasto    especialidades disponibles en cada uno para
                             el algoritmo de asignación.

  MIMIC-III / MIMIC-IV       Referencia para correlacionar signos vitales
  (dataset médico de acceso  con severidad, si se decide entrenar el
  académico)                 modelo de triage con datos reales
                             anonimizados.

  Common Voice (Mozilla) en  Ajusta el modelo de reconocimiento de voz a
  español                    acentos regionales para la transcripción
                             automática.
  -----------------------------------------------------------------------

*La lista de hospitales y su ubicación en Pasto corresponde a
información pública de directorios de salud del departamento.*

**4.8 Adaptación a la realidad de conectividad de Nariño**

Los sistemas de referencia de este tipo (como el coreano \"Smart EMS
119\") se apoyan en cobertura 5G ya desplegada. En Pasto y el resto de
Nariño, la cobertura 5G aún es limitada o inexistente para uso masivo,
por lo que el diseño debe apoyarse en 4G LTE como red principal, dejando
la arquitectura preparada para migrar a 5G cuando esté disponible. Para
las veredas y municipios sin buena señal celular, se propone un plan de
contingencia con mensajes de bajo ancho de banda (SMS) o radio troncal,
de modo que el sistema degrade su funcionalidad (por ejemplo,
transmitiendo solo texto en vez de video) en lugar de dejar de funcionar
por completo.

**4.9 Simulación física a escala reducida**

Al ser un sistema de coordinación entre múltiples actores (ambulancias,
hospitales, ciudad), la demo combina software y una maqueta física
sencilla:

-   Mini-ambulancia con una cámara pequeña y un micrófono conectados a
    un Raspberry Pi o ESP32-CAM, transmitiendo posición (GPS o simulada)
    y video/audio a un mini \"centro de control\" (laptop) que corre el
    backend.

-   Maqueta de ciudad con 2 o 3 \"hospitales\" representados por LED
    (verde = puede recibir, rojo = sin capacidad), cada uno con un botón
    físico para simular en vivo un cambio de disponibilidad durante la
    sustentación.

-   Dashboard mostrando el mapa con la ambulancia moviéndose, el video
    en vivo y la transcripción automática del reporte de voz llegando al
    hospital elegido en tiempo real.

Durante la sustentación se puede forzar, con el botón físico, que el
hospital más cercano quede \"sin cupo\", y mostrar cómo el sistema
reasigna automáticamente el destino sin que la ambulancia pierda tiempo
--- el efecto visual central para demostrar que se evita el \"paseo de
la muerte\".

**4.10 Etapas de desarrollo**

  -------------------------------------------------------------------------
  **Semana**   **Actividad**
  ------------ ------------------------------------------------------------
  1            Investigación de protocolos de triage (START/SALT), RCP
               (AHA), el estándar HL7 FHIR y la red hospitalaria real de
               Pasto.

  2            Diseño de la arquitectura y el modelo de datos (grafo vial,
               estructuras espaciales, hash tables).

  3            Implementación del KD-tree/Quadtree para ubicación de
               ambulancias y el grafo de rutas (A\*/Dijkstra).

  4            Implementación del min-heap para el scoring y selección de
               hospital, y la hash table de estado en tiempo real.

  5            Integración con el motor de rutas (OSRM/GraphHopper) y datos
               de OpenStreetMap.

  6            Entrenamiento e integración del modelo de triage (IA) y del
               modelo de visión de pre-triage.

  7            Integración del reconocimiento de voz y extracción de
               entidades clínicas para el registro automático.

  8            Desarrollo del dashboard en tiempo real (mapa, video en vivo
               y ficha clínica).

  9            Armado de la maqueta física de demostración (ambulancia con
               cámara/micrófono/ESP32, ciudad con hospitales LED).

  10           Pruebas integrales y preparación de la sustentación.
  -------------------------------------------------------------------------

  -----------------------------------------------------------------------
  **MATERIA: PATRONES DE DISEÑO (BACKEND JAVA)**

  -----------------------------------------------------------------------

**5. Proyecto 4 --- Verificación de Asepsia Quirúrgica (Prevención de
Infecciones)**

***Materia: Patrones de Diseño (Backend Java)***

**5.1 Problema y justificación**

Las infecciones de sitio quirúrgico (ISQ) son una de las complicaciones
postoperatorias más frecuentes y costosas, y hoy la verificación de
asepsia depende en gran parte de checklists manuales e inspección visual
del personal, propensos a error humano y a criterios subjetivos. El
sistema propuesto mide de forma objetiva el nivel de contaminación de
las zonas críticas antes y después de la cirugía (instrumental, mesa
quirúrgica, manos del personal, sitio de incisión), comparando ambos
estados para detectar fallas de protocolo y estimar el riesgo real de
infección, en lugar de asumir que \"se siguió el protocolo\" solo porque
se marcó una casilla.

**5.2 Arquitectura de software (patrones aplicados)**

-   Chain of Responsibility: procesa cada checkpoint de asepsia
    (instrumental → mesa quirúrgica → manos del personal → sitio de
    incisión) en secuencia; cada eslabón valida su lectura contra el
    umbral correspondiente y decide si continúa o detiene el flujo
    marcando una alerta.

-   Strategy: intercambia el algoritmo de evaluación según el tipo de
    superficie o sensor --- umbral de RLU para superficies metálicas
    swabbeadas, modelo de visión para telas o superficies curvas donde
    el swab es poco confiable.

-   Factory Method: crea el adaptador correcto según el dispositivo
    físico conectado (lector ATP por Bluetooth, cámara UV, entrada
    manual de respaldo), desacoplando el pipeline del hardware
    específico.

-   Observer: notifica en tiempo real al personal de control de
    infecciones cuando un checkpoint falla el umbral, sin acoplar el
    motor de validación a la lógica de notificación.

-   Composite: agrupa los resultados de todos los checkpoints de una
    cirugía en una estructura de árbol (cirugía → zona → checkpoint),
    permitiendo calcular un score de asepsia global tratando checkpoints
    individuales y grupos de forma uniforme.

**5.3 Stack tecnológico**

  -------------------------------------------------------------------------
  **Componente**   **Tecnología**             **Por qué**
  ---------------- -------------------------- -----------------------------
  Backend          Java 17 + Spring Boot      Cumple el requisito de
                                              backend Java para patrones;
                                              Spring facilita Chain of
                                              Responsibility con
                                              interceptores/filtros y
                                              Observer con
                                              ApplicationEventPublisher.

  Sensores         Lector ATP por             Combina una medición
                   bioluminiscencia           bioquímica objetiva (RLU) con
                   (Bluetooth/USB) + cámara   una verificación visual de
                   con filtro UV              residuo fluorescente,
                                              cubriendo superficies
                                              difíciles de hisopar.

  IA --- riesgo    Modelo de clasificación    Predice probabilidad de
                   (Random Forest / XGBoost)  infección de sitio quirúrgico
                                              combinando lecturas de
                                              contaminación con factores
                                              clínicos del paciente, no
                                              solo un umbral fijo.

  IA --- visión    CNN ligera (tipo           Clasifica el residuo
                   MobileNet)                 fluorescente visible bajo luz
                                              UV en superficies donde el
                                              hisopado ATP es poco
                                              práctico.

  Inferencia       ONNX Runtime for Java      Ejecuta ambos modelos
                                              embebidos directamente en el
                                              backend Java, sin
                                              microservicio adicional.

  Base de datos    PostgreSQL                 Trazabilidad de checkpoints
                                              por cirugía, necesaria para
                                              auditorías de control de
                                              infecciones.

  Frontend         React + TypeScript         Dashboard con el reporte
                                              comparativo de asepsia
                                              antes/después de la cirugía,
                                              por zona.
  -------------------------------------------------------------------------

**5.4 Opciones de inteligencia artificial**

  ------------------------------------------------------------------------
  **Opción**             **Descripción**            **Ventaja /
                                                    Limitación**
  ---------------------- -------------------------- ----------------------
  A. Umbral fijo (sin    Comparar cada lectura de   Simple y ya validado
  IA)                    RLU o imagen UV contra un  clínicamente.
                         umbral estándar de guías   Limitación: no aprende
                         CDC/AAMI.                  de patrones del
                                                    hospital ni de
                                                    factores del paciente
                                                    --- no constituye
                                                    realmente un
                                                    componente de IA.

  B. Modelo de riesgo    Clasificación (Random      Predice probabilidad
  entrenado              Forest/XGBoost) combinando real de infección,
                         lecturas de contaminación  mucho más defendible
                         con factores clínicos      como proyecto de IA.
                         (duración de cirugía, tipo Limitación: requiere
                         de herida, score ASA).     dataset etiquetado con
                                                    desenlaces de
                                                    infección.
  ------------------------------------------------------------------------

Recomendación: usar la Opción B como componente principal, calibrando
sus umbrales internos con los valores estándar de la Opción A como línea
base clínicamente aceptada.

**5.5 Fuentes de datos**

  -----------------------------------------------------------------------
  **Fuente**                 **Uso**
  -------------------------- --------------------------------------------
  Guías CDC / AAMI / OMS de  Umbrales de referencia de RLU y criterios de
  limpieza hospitalaria      limpieza para calibrar el modelo y las
                             alertas.

  Índice de riesgo NNIS/NHSN Variables clínicas estándar (duración de
  (literatura de infección   cirugía, clasificación de herida, score ASA)
  de sitio quirúrgico)       usadas como features y como base para
                             generar un dataset sintético realista.

  Dataset propio simulado    Los datos reales de pacientes están
                             protegidos por habeas data/HIPAA; se genera
                             un dataset sintético a partir de los rangos
                             y correlaciones publicadas en estudios de
                             ISQ.
  -----------------------------------------------------------------------

**5.6 Simulación física a escala reducida**

La maqueta permite demostrar la medición de asepsia sin necesidad de un
quirófano real ni de pacientes:

-   Mini \"mesa quirúrgica\" con bandeja de instrumental metálico y paño
    quirúrgico de tela.

-   Gel o loción fluorescente (tipo Glo Germ) aplicado como contaminante
    simulado sobre las superficies antes de la limpieza.

-   Lámpara UV para revelar el residuo fluorescente; una cámara captura
    la imagen antes y después de \"limpiar\" cada superficie.

-   Kit de prueba ATP económico (hisopo + luminómetro portátil) para
    tomar lecturas reales de RLU en cada checkpoint.

-   ESP32/Arduino opcional para sincronizar el encendido de la lámpara
    UV con la captura de la cámara.

El backend recibe la imagen UV y la lectura de RLU de cada checkpoint,
las procesa mediante el pipeline de Chain of Responsibility, y genera un
reporte comparativo antes/después mostrando qué zonas pasaron o fallaron
el umbral --- visible y verificable en vivo durante la sustentación.

**5.7 Etapas de desarrollo**

  -------------------------------------------------------------------------
  **Semana**   **Actividad**
  ------------ ------------------------------------------------------------
  1            Investigación de estándares de asepsia (CDC/AAMI) y
               definición de checkpoints y umbrales.

  2            Diseño de la arquitectura de patrones (Chain of
               Responsibility, Strategy, Factory, Observer, Composite).

  3            Implementación del backend Java/Spring Boot con el pipeline
               de validación.

  4            Generación del dataset sintético y entrenamiento del modelo
               de riesgo (Random Forest/XGBoost).

  5            Entrenamiento y ajuste del modelo de visión para residuo
               fluorescente UV.

  6            Integración de los sensores físicos (ATP + cámara UV)
               mediante adaptadores (Factory).

  7            Armado del montaje físico de demostración.

  8            Desarrollo del dashboard con el reporte comparativo pre/post
               cirugía.

  9            Pruebas integrales y preparación de la sustentación.
  -------------------------------------------------------------------------

**6. Proyecto 5 --- Cazador de Jailbreaks (Red-teaming automático de
sistemas de IA)**

***Materia: Patrones de Diseño (Backend Java)***

**6.1 Problema y justificación**

Los sistemas de IA generativa ya toman decisiones y ejecutan acciones en
producción, y son vulnerables a ataques que prácticamente no existían
hace pocos años: inyección de prompt y jailbreaks conversacionales.
Encontrar estas fallas antes que un atacante externo es más barato que
reaccionar después de un incidente --- es la lógica detrás de
herramientas ya usadas en la industria como PyRIT (Microsoft) y Giskard.
Este proyecto automatiza ese proceso: un agente ataca sistemáticamente
los propios sistemas de IA del desarrollador (chatbots, agentes) para
encontrar jailbreaks antes de que lleguen a producción, usando tres LLM
con roles distintos: uno genera prompts de ataque cada vez más
sofisticados, otro es el sistema objetivo que se está probando, y un
tercero juzga si el ataque tuvo éxito. Cada intento fallido informa el
siguiente en un árbol de variantes que se poda a medida que se descartan
rutas sin salida, evitando gastar consultas en caminos ya sabidos como
inútiles.

**6.2 Arquitectura de software (patrones aplicados)**

  -----------------------------------------------------------------------
  **Patrón**       **Dónde vive**               **Por qué hace falta**
  ---------------- ---------------------------- -------------------------
  Strategy         Técnicas de generación de    Cada técnica es
                   ataque (role-play,           intercambiable; agregar
                   ofuscación, escalamiento     una nueva no toca el
                   multi-turno)                 resto del sistema.

  Abstract Factory Creación del atacante, el    Aísla de qué modelo
                   objetivo y el juez según     (Claude, GPT, local)
                   proveedor de LLM             proviene cada rol.

  Composite        El árbol de ataque           Un prompt sin expandir y
                                                uno con variantes hijas
                                                se tratan de forma
                                                uniforme al recorrer y
                                                podar el árbol.

  Chain of         Validación de cada candidato Filtro de duplicados →
  Responsibility   antes de enviarlo            verificación de que el
                                                objetivo es propio →
                                                umbral mínimo de score;
                                                cada eslabón decide si el
                                                candidato continúa.

  Observer         Cuando el juez confirma una  Guardar en base de datos,
                   vulnerabilidad               actualizar el dashboard y
                                                disparar una alerta
                                                reaccionan de forma
                                                independiente al mismo
                                                evento.
  -----------------------------------------------------------------------

Extensión a futuro (opcional, a investigar): Command para encapsular
cada intento de ataque y poder encolarlo o reintentarlo, y Builder para
ensamblar el prompt final por partes (intención + técnica + historial).

**6.3 Stack tecnológico**

  -----------------------------------------------------------------------
  **Componente**    **Tecnología**               **Por qué**
  ----------------- ---------------------------- ------------------------
  Backend           Java 17 + Spring Boot +      Spring AI actúa como
                    Spring AI                    capa de abstracción
                                                 sobre distintos
                                                 proveedores de LLM,
                                                 necesaria para el
                                                 Abstract Factory.

  Frontend          React + TypeScript + Vite    Consume el backend vía
                                                 REST y muestra el árbol
                                                 de ataque en tiempo
                                                 real.

  Base de datos     PostgreSQL vía JPA           Guarda sesiones de
                                                 ataque, árbol de nodos,
                                                 prompts probados y
                                                 vulnerabilidades
                                                 confirmadas.

  Despliegue        Backend en Railway o Render  Despliegue simple y
                    (Docker); frontend en        gratuito/económico,
                    Vercel; PostgreSQL           suficiente para una demo
                    administrado                 académica.
  -----------------------------------------------------------------------

**6.4 Opciones de proveedor de LLM**

  -----------------------------------------------------------------------
  **Opción**              **Descripción**            **Ventaja /
                                                     Limitación**
  ----------------------- -------------------------- --------------------
  A. API comercial        Atacante, objetivo y juez  Mejor calidad de
  (Claude, GPT) para los  corren sobre un modelo     generación de
  tres roles              comercial de alta calidad. ataques y de
                                                     criterio de juicio.
                                                     Limitación: costo
                                                     por token y
                                                     dependencia de
                                                     internet durante la
                                                     demo.

  B. Modelo local (Ollama Al menos uno de los tres   Sin costo por
  con Llama/Mistral)      roles corre localmente.    consulta y funciona
                                                     sin internet en la
                                                     sustentación.
                                                     Limitación: menor
                                                     sofisticación en los
                                                     ataques generados.
  -----------------------------------------------------------------------

Recomendación: usar el Abstract Factory para alternar libremente entre
proveedores, y en la demo usar un modelo local como \"sistema objetivo\"
(para no depender de internet) y una API comercial para el atacante y el
juez, donde la calidad del razonamiento importa más.

**6.5 Semillas de ataque y alcance responsable**

-   Recopilaciones públicas de técnicas de jailbreak conocidas (papers
    académicos, repositorios como JailbreakBench) como semillas
    iniciales para el generador de ataques.

-   Historial propio de intentos fallidos y exitosos, que el mismo
    sistema acumula y reutiliza para refinar futuros ataques.

-   Alcance responsable: el sistema ataca únicamente sistemas propios,
    nunca servicios de terceros --- exactamente como operan PyRIT y
    Giskard en la práctica real.

**6.6 Demostración para la sustentación**

A diferencia de los demás proyectos, este no requiere montaje físico: la
demo es enteramente en software. Se muestra en vivo el árbol de ataque
creciendo y podándose mientras el sistema prueba un chatbot propio
construido para el curso, con el dashboard marcando en tiempo real el
momento exacto en que el juez confirma una vulnerabilidad.

**6.7 Etapas de desarrollo**

  -------------------------------------------------------------------------
  **Semana**   **Actividad**
  ------------ ------------------------------------------------------------
  1            Investigación de técnicas de jailbreak conocidas y diseño
               del árbol de ataque.

  2            Diseño de la arquitectura de patrones (Strategy, Abstract
               Factory, Composite, Chain of Responsibility, Observer).

  3            Implementación del backend Java/Spring Boot con Spring AI e
               integración de proveedores de LLM.

  4            Implementación del árbol de ataque (Composite) y el pipeline
               de validación (Chain of Responsibility).

  5            Implementación del sistema de notificación (Observer) y la
               persistencia (PostgreSQL/JPA).

  6            Desarrollo de un sistema objetivo de prueba (chatbot propio
               simple) para atacar en la demo.

  7            Desarrollo del dashboard frontend mostrando el árbol de
               ataque y las vulnerabilidades confirmadas.

  8            Pruebas integrales y preparación de la sustentación.
  -------------------------------------------------------------------------

**7. Comparativa y conclusión**

  -----------------------------------------------------------------------
  **Criterio**      **Microgrids solares**     **Semáforos inteligentes**
  ----------------- -------------------------- --------------------------
  Estructura        Min-heap (cola de          Grafo + cola de prioridad
  central           prioridad)                 

  Complejidad de la Regresión (predicción de   Regresión o Reinforcement
  IA                generación)                Learning

  Dependencia de    Baja si se usa modelo      Ninguna (todo corre
  internet en la    propio                     localmente con SUMO/ESP32)
  demo                                         

  Impacto visual en Encendido/apagado de LEDs  Cambio de luces + carritos
  sustentación      según prioridad            moviéndose

  Mercado /         Electrificación rural,     Movilidad urbana,
  aplicabilidad     zonas no interconectadas   cualquier ciudad con
  real                                         tráfico
  -----------------------------------------------------------------------

Los cinco proyectos son técnicamente sólidos para sus respectivas
materias: los tres de Estructuras de Datos aplican una estructura
central de forma genuina (heap, grafo, KD-tree), y los dos de Patrones
de Diseño resuelven un problema real de orquestación con Java/Spring
Boot. Todos incorporan un componente real de inteligencia artificial más
allá de un chatbot, y la mayoría cuenta con una simulación física que
hace tangible el resultado frente al profesor. La elección final dentro
de cada materia puede basarse en cuál stack y dominio genera más interés
personal, dado que todos tienen una ruta de desarrollo viable en 8--10
semanas.
