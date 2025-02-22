
import * as vscode from 'vscode';
import { CommandsProps, handleError, MODEL_SELECTOR, processChatResponse, SYS_PROMPT } from '../common';

export const exploreTablesCommand = async ({
    request,
    stream,
    kustoClient,
    logger,
    cancellationToken,
    chatHistory = [],
}: CommandsProps) => {
    stream.progress('exploring the database...');
    let query = '';
    try {
        const dbSchema = await kustoClient.getSchema();
        const tablesBrief = await kustoClient.query('.show tables');
        // To get a list of all available models, do not pass any selector to the selectChatModels.
        stream.markdown('Found the following tables:\n\n');
        // tablesBrief has only 2 columns, create a markdown table for it
        const table =
            '| TableName | DatabaseName |\n| --- | --- |\n' +
            tablesBrief.data.map((row) => `| ${row[0]} | ${row[1]} |`).join('\n') +
            '\n';
        stream.markdown(table);
        stream.markdown('\n\n');
        stream.markdown('Analyzing...\n\n');
        const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
        // if request.prompt === '' then "please descrive"...
        let prompt = request.prompt || 'Please describe the database schema';
        if (model) {
            const messages = [
                ...chatHistory,
                vscode.LanguageModelChatMessage.User(dbSchema.toString() + '\n'),
                vscode.LanguageModelChatMessage.User(prompt),
            ];
            console.log(messages);
            const chatResponse = await model.sendRequest(messages, {}, cancellationToken);
            query = await processChatResponse(stream, chatResponse, kustoClient);
        }
    } catch (err) {
        console.error(err);
        stream.markdown('Failed exploring database.');
        handleError(logger, err, stream);
    }

    logger.logUsage('request', { kind: 'exploreDb' });
    return { metadata: { command: 'exploreDb', query: query } };
};
