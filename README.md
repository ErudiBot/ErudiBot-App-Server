# ErudiBot Application Server

A Discord bot that utilizes algorithms and machine learning to enhance team communication and cognition.
This repository is the application server of Erudibot. It will connect to external api and Erudibot backend service.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Usage](#usage)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js
- Git (for version control)
- A Discord account
- [Discord Developer Portal](https://discord.com/developers/applications) access to create a bot token

## Setup

Follow these steps to set up your development environment:

1. **Clone the repository**:
   ```bash
   git init
   git clone https://github.com/Nathathaii/ErudiBot-app-server.git
   cd ErudiBot-App-Server
   ```

2. **Set up**:
   ```bash
   npm init
   npm install
   ```

3. **Create .env file**:
   State variables in .env file


4. **Register discord bot commands**:
   ```bash
   node register-commands_global.js
   ```

## Usage
To run your bot locally, use the following command:
   ```bash
   nodemon
   ```

