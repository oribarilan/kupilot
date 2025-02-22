
import * as vscode from 'vscode';
import { CommandsProps, getKustoQuery, handleError, MODEL_SELECTOR, processChatResponse, SYS_PROMPT } from '../common';

export const previewResultsCommand = async ({
    request,
    stream,
    kustoClient,
    logger,
    cancellationToken,
    chatHistory = [],
}: CommandsProps) => {
    stream.progress('Analyzing the Kusto query...');
    const query = getKustoQuery(request.prompt);
    if (!query) {
        stream.markdown('No valid query provided. Make sure your query is wrapped in triple backticks and specify the language as `kusto`.');
        const example = 'For example:\n\n```\n```kusto\n// Your Kusto query here\n```\n```';
        stream.markdown('For example:\n\n' + example);
        return { metadata: { command: 'previewResults', query: '' } };
    }
    try {
        stream.progress('Querying for results...');
        // strip \n from query
        const queryPreview = query + ' | take 10';
        const resultsPreview = await kustoClient.query(queryPreview);
        const resultsPreviewMarkdown = resultsPreview.printRowAsMarkdownTable();
        if (resultsPreviewMarkdown) {
            stream.markdown('Here is the preview:\n\n');
            stream.markdown(resultsPreviewMarkdown);
        } else {
            stream.markdown('No results found for the query.');
        }
    } catch (err) {
        console.error(err);
        stream.markdown('Failed exploring database.');
        handleError(logger, err, stream);
    }

    logger.logUsage('request', { kind: 'resultsPreview' });
    return { metadata: { command: 'resultsPreview', query: '' } };
};
