
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
