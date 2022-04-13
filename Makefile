DOCKER_BUILD_CMD = docker build
detected_OS := $(shell sh -c 'uname 2>/dev/null || echo Unknown')
ifeq ($(detected_OS),Darwin)        # Mac OS X
    DOCKER_BUILD_CMD = docker buildx build --platform linux/amd64
endif

dev-requires:
	pip install -e .[dev]

pre-release: dev-requires
	pip install build
	python3 -m build
	python3 -m twine upload --repository testpypi dist/*

release: dev-requires
	pip install build
	python3 -m build
	python3 -m twine upload dist/*

docker-build:
	$(DOCKER_BUILD_CMD) -t piperider-cli:$$(cat piperider_cli/VERSION) .
