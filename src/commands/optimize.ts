import * as vscode from 'vscode';
import { CommandsProps, getBestPractices, handleError, MODEL_SELECTOR, generateQueryLink, kustoQueryHandler, processChatResponse } from '../common';

export const optimizeCommand = async ({
    request,
    stream,
    logger,
    cancellationToken,
    kustoClient,
    chatHistory = [],
}: CommandsProps) => {
    stream.progress('Analyzing given query...');
    let query = '';
    try {
        const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
        if (model) {
            const messages = [
                vscode.LanguageModelChatMessage.User(
                    '<Best Practices>\n' + (await getBestPractices()) + '\n' + '</Best Practices>\n'
                ),
                ...chatHistory,
                vscode.LanguageModelChatMessage.User(
                    'Please optimize the given query, using the best practices.'
                ),
                vscode.LanguageModelChatMessage.User(
                    '<Optimization Request>\n' + request.prompt + '\n' + '</Optimization Request>\n'
                ),
            ];

            const chatResponse = await model.sendRequest(messages, {}, cancellationToken);
            query = await processChatResponse(stream, chatResponse, kustoClient);
        }
    } catch (err) {
        console.error(err);
        stream.markdown('Failed optimizing query.');
        handleError(logger, err, stream);
    }

    logger.logUsage('request', { kind: 'optimize' });
    return { metadata: { command: 'optimize', query: query } };
};
