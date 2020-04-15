const dialogflow = require('dialogflow');
const uuid = require('uuid');
const { struct } = require('pb-util');

/*
    Input:
        msg = {
            payload: {
                text: string,
                languageCode: string,
                contexts: googleContextObjects[],
                contexts: {
                    [contextId] : {
                        params: {},
                        lifespanCount: number
                    }
                }
            },
            dialogFlowSessionId: string
            credentials: {
                dialogFlow: {
                    sessionclient stuff
                }
            }
        }
    Output:
        msg = {
            payload: responses
        }
*/
module.exports = (RED) => {


    async function convertToContexts(projectId, sessionPath, msg) {
        const out = [];
        const contextIds = Object.keys();
        for (const contextId of contextIds) {
            const context = msg.contexts[contextId];
            const contextPath = contextsClient.contextPath(
                projectId,
                msg.dialogFlowSessionId,
                contextId,
            );
            const request = {
                parent: sessionPath,
                context: {
                    name: contextPath,
                    lifespanCount: context.lifespanCount,
                },
            };
            if (context.params) {
                request.context.parameters = struct.encode(context.params);
            }
            const [outContext] = await contextsClient.createContext(request);
            out.push(outContext);
        }
        return out;
    }


    function BasicDetectIntent(config) {
        RED.nodes.createNode(this, config);
        this.projectId = config.projectId;
        this.name = config.name;

        this.on('input', async (msg, send, done) => {
            let sessionClient
            try {
                sessionClient = new dialogflow.SessionsClient(msg.credentials.dialogFlow);
            } catch (ex) {
                this.error('Failed to create session!', ex);
                return;
            }
            this.warn('alright..')
            if (!msg.dialogFlowSessionId) {
                msg.dialogFlowSessionId = uuid.v4();
            }
            let sessionPath;
            try {
                sessionPath = sessionClient.sessionPath(this.projectId, msg.dialogFlowSessionId);
            } catch (ex) {
                this.error('failed to make session path');
                return;
            }
            const request = {
                session: sessionPath,
                queryInput: {
                    text: {
                        // The query to send to the dialogflow agent
                        text: msg.payload.text,
                        // The language used by the client (en-US)
                        languageCode: msg.payload.languageCode,
                    },
                },
            };
            if (msg.payload.contexts) {
                if (!Array.isArray(msg.payload.contexts)) {
                    try {
                        request.queryParams = {
                            contexts: await convertToContexts(this.projectId, sessionPath, msg),
                        };
                    } catch (ex) {
                        this.error('Failed to Convert supplied contexts to Google Contexts');
                        this.error(ex);
                        return;
                    }
                } else {
                    // using google contexts directly
                    request.queryParams = {
                        contexts: msg.payload.contexts,
                    };
                }
            }
            try {
                const responses = await sessionClient.detectIntent(request);
                msg.payload = responses;
                send(msg);
            } catch (ex) {
                this.error('Failed to detect intent!');
                this.error(ex);
            }
        });
    }

    RED.nodes.registerType("dialogflow-v2-very-basic", BasicDetectIntent);
};
