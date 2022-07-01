DOCKER_BUILD_CMD = docker build
detected_OS := $(shell sh -c 'uname 2>/dev/null || echo Unknown')
ifeq ($(detected_OS),Darwin)        # Mac OS X
    DOCKER_BUILD_CMD = docker buildx build --platform linux/amd64
endif

dev-requires:
	pip install -e .[dev]

flake8:
	@echo "Check Python coding style by flake8 ..."
	@flake8
	@echo "Passed"

test: dev-requires
	py.test --cov=piperider_cli --cov-report html tests

pre-release: dev-requires
	pip install build
	python3 -m build
	python3 -m twine upload --repository testpypi dist/*

release: dev-requires
	pip install build
	python3 -m build
	python3 -m twine upload dist/*

require-%:
	@if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

bump-version: require-VERSION
	@echo "Bumping version to ${VERSION}"
	@echo "${VERSION}" > piperider_cli/VERSION

docker-build: require-VERSION
	$(DOCKER_BUILD_CMD) --build-arg PIPERIDER_VERSION=${VERSION} -t piperider:${VERSION} .

docker-deploy: docker-build
	docker tag piperider:${VERSION}  infuseai/piperider:${VERSION}
	docker push infuseai/piperider:${VERSION}

docker-deploy-latest: docker-build
	docker tag piperider:${VERSION}  infuseai/piperider:latest
	docker push infuseai/piperider:latest

generate-cli-docs:
	@python3 -m piperider_cli.docgen
