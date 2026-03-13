# Stage 1: Build the Vite application
FROM node:20-alpine AS build
WORKDIR /app

# Copy package.json and package-lock.json first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Accept build arguments (Coolify will inject these)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set them as environment variables so Vite can bake them into the build
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

# Build the application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built frontend assets from the builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Replace the default Nginx config with our custom one for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 based on the architectural requirements
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
