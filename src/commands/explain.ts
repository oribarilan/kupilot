import * as vscode from 'vscode';
import { CommandsProps, handleError, MODEL_SELECTOR, processChatResponse, SYS_PROMPT } from '../common';

export const explainCommand = async ({
    request,
    stream,
    kustoClient,
    logger,
    cancellationToken,
    chatHistory = [],
}: CommandsProps) => {
    stream.progress('Trying to understand what you did 😳');
    try {
        const editor = vscode.window.activeTextEditor;
        const selection = editor?.selection;
        let highlighted;
        if (selection && !selection.isEmpty) {
            const selectionRange = new vscode.Range(
                selection.start.line,
                selection.start.character,
                selection.end.line,
                selection.end.character
            );
            highlighted = editor.document.getText(selectionRange);
        }

        if (!highlighted) {
            handleError(logger, 'No text selected', stream);
            return { metadata: { command: 'explain', query: '' } };
        }

        stream.progress('Working on explanation \n\n');

        const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
        let prompt = request.prompt || 'Please explain this code snippet';
        if (model) {
            const messages = [
                ...chatHistory,
                vscode.LanguageModelChatMessage.User(prompt),
                vscode.LanguageModelChatMessage.User('```' + highlighted + '```'),
            ];

            const chatResponse = await model.sendRequest(messages, {}, cancellationToken);
            await processChatResponse(stream, chatResponse, kustoClient);
        }
    } catch (err) {
        console.error(err);
        stream.markdown('Failed exploring database.');
        handleError(logger, err, stream);
    }

    logger.logUsage('request', { kind: 'explain' });
    return { metadata: { command: 'explain', query: '' } };
};
