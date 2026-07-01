# ---------- Base Image ----------
FROM node:24-alpine

# ---------- App Directory ----------
WORKDIR /app

# ---------- Copy only package files ----------
COPY package*.json ./

# ---------- Install dependencies ----------
RUN npm ci --omit=dev

# ---------- Copy app code ----------
COPY . .

# ---------- Create non-root user ----------
RUN addgroup -S app && adduser -S app -G app

# ---------- Set permissions ----------
RUN chown -R app:app /app

# ---------- Switch user ----------
USER app

# ---------- Expose port ----------
EXPOSE 4000

# ---------- Start app ----------
CMD ["node", "index.js"]