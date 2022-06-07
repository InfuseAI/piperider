DOCKER_BUILD_CMD = docker build
detected_OS := $(shell sh -c 'uname 2>/dev/null || echo Unknown')
ifeq ($(detected_OS),Darwin)        # Mac OS X
    DOCKER_BUILD_CMD = docker buildx build --platform linux/amd64
endif

dev-requires:
	pip install -e .[dev]

test: dev-requires
	py.test --cov=piperider_cli --cov-report xml tests

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

docker-build:
	$(DOCKER_BUILD_CMD) -t piperider-cli:$$(cat piperider_cli/VERSION) .

docker-deploy: docker-build
	docker tag piperider-cli:$$(cat piperider_cli/VERSION) infuseai/piperider-cli:$$(cat piperider_cli/VERSION)
	docker push infuseai/piperider-cli:$$(cat piperider_cli/VERSION)

generate-cli-docs:
	@python3 -m piperider_cli.docgen
