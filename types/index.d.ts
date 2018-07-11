export interface LogFacesUDPAppender {
        type: '@log4js-node/logfaces-udp';
        // (defaults to ‘127.0.0.1’)- hostname or IP address of the logFaces receiver
        remoteHost?: string;
        // (defaults to 55201) - port the logFaces receiver is listening on
        port?: number;
        // (defaults to empty string) - used to identify your application’s logs
        application?: string;
}
