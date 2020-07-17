const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf, colorize } = format;

const consoleFormat = combine(
    timestamp(),
    colorize(),
    printf(({timestamp, service, level, message}) =>
        `${timestamp} ${level}: ${message}`,
    ),
);

const fileFormat = combine(
    timestamp(),
    format.json(),
);

const logger = createLogger({
    level: 'info',
    defaultMeta: { service: 'game-server' },
    transports: [
        new transports.File({
            filename: './logs/combined.log',
            format: fileFormat,
            handleExceptions: true,
        }),
        new transports.Console({
            format: consoleFormat,
        }),
    ],
});

module.exports = logger;