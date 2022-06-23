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

Open `http://localhost:3000` in your browser.

### Comparsion Report

```sh
$ npm run start:compare # make dev-compare
```

Open `http://localhost:3001` in your browser.

## Build

> **Note**
>
> Generated **single report** and **comparison report** will place into [piperider_cli/data/report](https://github.com/InfuseAI/piperider/tree/main/piperider_cli/data/report).

You can use npm scripts, or use `make` commands.

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
$ make build
```
