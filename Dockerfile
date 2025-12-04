# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --legacy-peer-deps
RUN cd server && npm ci && cd ..

# Copy source code and build client
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime
WORKDIR /app

# Copy only necessary files
COPY package*.json ./
COPY server/package*.json ./server/

# Install only production dependencies
RUN npm ci --legacy-peer-deps --omit=dev
RUN cd server && npm ci --omit=dev && cd ..

# Copy built assets and server
COPY --from=build /app/dist ./dist
COPY server/server.js ./server/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["npm", "start"]
