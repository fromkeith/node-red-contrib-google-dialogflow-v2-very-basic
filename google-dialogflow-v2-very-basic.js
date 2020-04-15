const dialogflow = require('dialogflow');
const uuid = require('uuid');


/*
    Input:
        msg = {
            payload: {
                text: string,
                languageCode: string,
                contexts: context[]
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
            if (msg.payload.contexts && msg.payload.contexts.length > 0) {
                request.queryParams = {
                    contexts: msg.payload.contexts,
                };
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
