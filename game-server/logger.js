const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

const consoleFormat = combine(
    timestamp(),
    colorize(),
    printf(({timestamp, service, level, message}) =>
        `${timestamp} ${level}: ${message}`,
    ),
);

// Disabling the structured-log format fow now in favor of stdout log stream + docker logs
// Keeping this format as a comment in case we want to change the stdout logs to json format for consumption and analysis
// const fileFormat = combine(
//     timestamp(),
//     format.json(),
// );

const logger = createLogger({
    level: 'info',
    defaultMeta: { service: 'game-server' },
    transports: [
        // new transports.File({
        //     filename: './logs/combined.log',
        //     format: fileFormat,
        //     handleExceptions: true,
        // }),
        new transports.Console({
            format: consoleFormat,
        }),
    ],
});

module.exports = logger;