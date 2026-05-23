const defaultOrigins = [
  'http://localhost:5173',
  'https://pulsewatch-dun.vercel.app',
];

export const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URLS,
  ...defaultOrigins,
]
  .filter(Boolean)
  .flatMap((origin) => origin!.split(','))
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const isOriginAllowed = (origin?: string) => {
  if (!origin) return true;
  return configuredOrigins.includes(origin.replace(/\/+$/, ''));
};
