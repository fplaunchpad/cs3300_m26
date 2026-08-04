# CS3300 : Compiler Design

This is the website for the Monsoon 2026 course "Compiler Design" at the
Department of Computer Science and Engineering at the Indian Institute of
Technology, Madras.

### Docker Development Environment

This repository includes a `Dockerfile` to provide a consistent, architecture-agnostic environment (including Java, Flex, Bison, and SPIM) for assignments.

#### 1. Build the Image

**Linux users:** Build the image using your host UID and GID so files generated inside the container are owned by your user rather than `root`.

```bash
docker build --build-arg UID=$(id -u) --build-arg GID=$(id -g) -t compiler-env .
```

**Windows and macOS users:** The default build command is sufficient.

```bash
docker build -t compiler-env .
```

#### 2. Run the Container

Start an interactive container with your project directory mounted at `/workspace`.

```bash
docker run -it --rm -v <path-to-project>:/workspace compiler-env
```

Replace `<path-to-project>` with the absolute path to your project directory.
