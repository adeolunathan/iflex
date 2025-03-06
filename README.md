# FinanceForge (Flex) Platform

FinanceForge is a next-generation financial modeling platform that emphasizes intuitive from-scratch model building rather than relying on templates.

## Project Structure
- `/services` - Backend microservices
- `/frontend` - React-based frontend application
- `/libraries` - Shared libraries and utilities
- `/infrastructure` - Deployment and infrastructure configuration
- `/docs` - Project documentation

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js (v16+)
- npm or yarn

### Development Setup
1. Clone the repository
2. Copy `.env.example` to `.env` and update with your local configuration
3. Run `docker-compose up` to start all services
4. Access the application at http://localhost:3000

## Architecture

FinanceForge uses a microservices architecture with the following components:
- Model Service
- Calculation Engine
- User Management Service
- Integration Service
- Collaboration Service
- Analytics Service
- Export Service

For more details, see the architecture documentation in the `/docs` directory.

