# Tormenta

> **Frase de la ficha:** [Escribe aquí la frase exacta de tu ficha.]

## Cómo se juega

- Juega en un tablero de 5 × 5: cada turno tienes tres acciones; usa los botones **Drenar** y **Evacuar** o recórrelos con Tab y actívalos con Enter.
- **Drenar** baja el agua de una zona y sus vecinas; **Evacuar** pone a salvo a todas las familias de una zona.
- Cada turno sube el agua y la fila sur recibe una crecida más intensa; salva al menos el 70 % de las familias antes de terminar el turno 8.

## Jugar

[Jugar Tormenta en GitHub Pages](https://valeria857.github.io/Proyetco/)

## Cómo correrlo en otra máquina

Se necesita Node.js 22. Desde la carpeta del proyecto, ejecuta:

```sh
npm ci
npm run dev
```

Para ejecutar las pruebas y construir el sitio:

```sh
npm test
npm run build
```

## Organización del proyecto

- `index.html`: documento HTML inicial y punto de entrada de la aplicación.
- `src/main.ts`: interfaz del juego, representación del tablero y manejo de las acciones.
- `src/juego.ts`: reglas, estado, acciones y resultados de la partida.
- `src/style.css`: estilos y diseño adaptable de la interfaz.
- `test/juego.test.ts`: pruebas automatizadas de las reglas del juego.
- `package.json`: dependencias y comandos de desarrollo, pruebas, compilación y lint.
- `package-lock.json`: versiones concretas de las dependencias para instalaciones reproducibles.
- `vite.config.ts`: configuración de la ruta base de la aplicación al construirla.
- `vitest.config.ts`: configuración del entorno y la ubicación de las pruebas.
- `eslint.config.js`: reglas de análisis estático e ignorados de ESLint.
- `.github/workflows/deploy.yml`: pruebas, compilación y publicación automática en GitHub Pages.
- `public/favicon.svg`: icono del sitio.
- `public/icons.svg`: símbolos SVG utilizados por el sitio.

## Reflexión personal

### Qué dirigí yo

Dirigí la configuración del entorno de despliegue continuo y pedí cambiar la visibilidad del repositorio a público junto con la selección de GitHub Actions como fuente de GitHub Pages para corregir los fallos de publicación.

### Qué error encontré jugando que la máquina no avisó

Al jugar, encontré que los jugadores no entendían qué hacer ni cuál era el objetivo del juego al iniciar, aunque las pruebas automáticas no lo detectaron porque el código compilaba y ejecutaba sin errores técnicos.

## Declaración de autoría

Usé VS Code, GitHub Actions y un asistente de IA. El código lo generó un agente de IA bajo mi dirección y supervisión. Puedo explicar la estructura del archivo vite.config.ts, la automatización del archivo .github/workflows/deploy.yml, el flujo de despliegue en GitHub Pages y la lógica principal del juego.
