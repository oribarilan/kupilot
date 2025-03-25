<div align="center">
<h1>Kupilot</h1>

<img width="25%" src="./kupilot.jpg">

<br />
<br />

<p>An unofficial Azure Data Explorer (aka Kusto) Copilot, integrated in your IDE</p>

</div>

<hr />

## Intro

Kupilot is a VSCode extension that adds GitHub Copilot support for Azure Data Explorer (aka Kusto).

Please note - Kupilot currently supports working against a single Database at a time.

## Highlights

Kupilot can help you build better queries, investigate issues, ask questions and explore **YOUR** database.  
See it in action:

<div align="center">
  <br />
  <img width="55%" src="./kupilot.gif">
  <br />
</div>

## Pre-requisites

### Azure CLI

1. This extension does not use secrets. Instead, it uses Azure CLI to authenticate with Kusto. Make sure you have it installed ([instructions here](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)).
2. Run `az login` to authenticate with Azure. You may need to run `az login --tenant <tenant-id>` if you have multiple tenants.

## Installation

1. Kupilot is available in the [marketplace](https://marketplace.visualstudio.com/items?itemName=obi.kupilot), just search for it in the VSCode extension tab or navigate to the marketplace and install it.
2. Configure the extension with one of the options below:
    1. Manually set the following settings in your `settings.json`:
    ```json
    "kupilot.clusterUri": "https://<cluster-name>.<region>.kusto.windows.net",
    "kupilot.database": "<database-name>",
    "kupilot.tenantId": "<tenant-id>",
    ```
    2. Prompt `@kupilot` with `/configure` command in the chat. You will be prompted to enter the clusterUri, database and tenantId.

## Usage

In GitHub Copilot chat, tag `@kupilot` to summon Kusto Copilot!

You can ask any question in free text, or use the following commands:

### Explore DataBase

`/exploreDb`

List all tables and their coloumns in the database, as well as share additional information if found. Optionally, you can add a question as well.

### Optimize

`/optimize`

Optimize a query based on Kusto best practices.

### Teach me something new

`/somethingNew`

Teach me a new thing about Kusto and KQL.

### Explain a selection

`/explain`

Explain the selected code snippet to me.

## Development

### Setup

0. Before starting, make sure you followed the `Installation` steps.
1. This project works with Node >= 20.11.0. Before starting, make sure you're using the correct node version.
2. Run `npm install` in the root of the repository.
3. Run `npm run compile` (after every change) to compile the TypeScript code.
4. Open the debug view in VSCode and run the "Run Extension" task, this will build the extension and open a new VSCode instance.
5. Open the Copilot Chat extension in the new VSCode instance and interact with the extension.

### CI

On every Pull Request, the CI will build a `.vsix` file. You can sideload it into VSCode if you want to do E2E testing.
You can find the workflow [here](https://github.com/oribarilan/kupilot/actions/workflows/package.yml).

### CD

For releasing a new version, you need to bump the version in `package.json` and push the code into master.
A new release will be created automatically. See the [Versioning Guidelines](#versioning-guidelines) below for more information.

#### Versioning Guidelines

We use [Semantic Versioning](https://semver.org/). When you're ready to release a new version, update the `version` field in `package.json` and create a new release.
Currently versioning is managed manually by incrementing the version in `package.json`.

Guidelines gist:

-   Major version increments when you introduce breaking change, or significant changes to the extension.
-   Minor version increments when you add new features.
-   Patch version increments when you fix minor issues.
