# PipeRider Report

## Installation

```sh
$ npm install
```

## Development

### Single Report

```sh
$ npm run start # make dev
```

### Comparsion Report

```sh
$ npm run start:compare # make dev-compare
```

## Build

> **Note**
>
> Generated **single report** and **comparison report** will place into [piperider_cli/data/report](https://github.com/InfuseAI/piperider/tree/main/piperider_cli/data/report).

You can use npm running build scripts, or use below `make` commands.

### Single Report

```sh
$ make build-single
```

### Comparsion Report

```sh
$ make build-comparison
```

### Build Single & Comparison Reports

```sh
$ make build-all
```
