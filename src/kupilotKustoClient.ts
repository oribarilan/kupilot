import { KustoResultColumn } from 'azure-kusto-data';

const KustoClient = require('azure-kusto-data').Client;
const KustoConnectionStringBuilder = require('azure-kusto-data').KustoConnectionStringBuilder;

export class KustoQueryResult {
    columns: KustoResultColumn[];
    data: any[][];

    constructor(columns: KustoResultColumn[], data: any[][]) {
        this.columns = columns;
        this.data = data;
    }

    public toString(): string {
        // print columns: <name> (<type>)
        const columns = this.columns.map((c) => `${c.name} (${c.type})`).join(', ');
        // print data rows, print <null> if value is null
        const data = this.data
            .map((row) => row.map((v) => (v === null ? '<null>' : v)).join(', '))
            .join('\n');

        return `Columns: ${columns}\nData:\n${data}`;
    }

    // from KustoResponseDataSetV2
    public static fromKustoResponseDataSetV2(response: any): KustoQueryResult {
        const columns = response.primaryResults[0].columns;
        const data = response.primaryResults[0]._rows;
        return new KustoQueryResult(columns, data);
    }

    public printRowAsMarkdownTable(num: number = 5): string {
        if (this.data.length === 0) {
            return '';
        }

        const topRows = this.data.slice(0, num);
        const headers = this.columns.map(col => col.name).join(' | ');
        const separator = this.columns.map(() => '---').join(' | ');
        const row = topRows.map(row => row.map(value => (value === null ? '<null>' : value)).join(' | ')).join(' |\n| ');

        return `| ${headers} |\n| ${separator} |\n| ${row} |`;
    }
}

export class KupilotKustoClient {
    private client: any;
    private clusterUri: string;
    public database: string;
    public clusterName: string;
    public schema: any;

    constructor(clusterUri: string, tenantId: string, database: string) {
        const kcsb = KustoConnectionStringBuilder.withAzLoginIdentity(clusterUri, tenantId);
        this.client = new KustoClient(kcsb);
        this.database = database;
        this.clusterUri = clusterUri;
        const regex = /https:\/\/(.*?)\.kusto\.windows\.net/;
        const match = this.clusterUri.match(regex);
        const clusterName = match ? match[1] : '';
        this.clusterName = clusterName;
    }

    async query(query: string): Promise<KustoQueryResult> {
        try {
            var results = await this.client.execute(this.database, query);
            var kus_res = KustoQueryResult.fromKustoResponseDataSetV2(results);
            console.log(kus_res.toString());
            return kus_res;
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        }
    }

    async getSchema() {
        if (!this.schema) {
            this.schema = await this.query('.show database schema as json');
        }

        return this.schema;
    }
}
