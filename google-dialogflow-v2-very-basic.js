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
            const sessionClient = new dialogflow.SessionsClient(msg.credentials.dialogFlow);
            if (!msg.dialogFlowSessionId) {
                msg.dialogFlowSessionId = uuid.v4();
            }
            const sessionPath = sessionClient.sessionPath(this.projectId, msg.dialogFlowSessionId);
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
            if (contexts && contexts.length > 0) {
                request.queryParams = {
                    contexts: msg.payload.contexts,
                };
            }
            const responses = await sessionClient.detectIntent(request);
            msg.payload = responses;
            send(msg);
        });
    }

    RED.nodes.registerType("dialogflow-v2-very-basic", BasicDetectIntent);
};
