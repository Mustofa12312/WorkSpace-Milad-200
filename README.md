# Workspace Milad 200

A production-ready, multi-tenant workspace and team collaboration application built with React, Vite, and Firebase.

## Features

- **Multi-tenant Architecture:** Data is strictly segregated by `organizationId`. Users can only see and modify data within their organization.
- **Role-Based Access Control (RBAC):** Built-in roles (Owner, Admin, Manager, Member) enforced both on the client UI and by Firestore/Storage security rules.
- **Real-time Sync:** Powered by Zustand and Firebase Firestore `onSnapshot`, ensuring all team members see updates instantly.
- **Kanban Board:** Drag-and-drop task management.
- **Meeting Room:** In-browser audio recording for meetings, uploaded directly to Firebase Storage.
- **Document Management:** Secure file uploads with size and type restrictions.
- **Secure by Default:** Comprehensive Firestore and Storage security rules prevent unauthorized access and data hijacking.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, Lucide React
- **Backend (BaaS):** Firebase (Auth, Firestore, Storage)
- **Testing:** Vitest, React Testing Library, Firebase Local Emulator Suite
- **CI/CD:** GitHub Actions (Linting, Type-checking, Testing), Vercel SPA deployment
- **Git Hygiene:** Husky, Commitlint (Conventional Commits)

## Prerequisites

- Node.js >= 20
- A Firebase project (create one at [Firebase Console](https://console.firebase.google.com/))
- Firebase CLI (`npm install -g firebase-tools`)
- Java 21+ (required for Firebase Local Emulator Suite during testing)

## Setup Instructions

### 1. Firebase Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project or select an existing one.
3. Enable **Authentication** (Email/Password & Google providers).
4. Enable **Firestore Database**.
5. Enable **Storage**.
6. Register a Web App in your project settings to get your Firebase SDK config.

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` and fill in the values from your Firebase SDK config. These variables are exposed to the client bundle but are safe to be public.

> **Important:** Your data is protected by Firebase Security Rules, not by keeping these keys secret. Never put service-account (backend) keys in this file.

### 3. Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

### 4. Deploying Security Rules

To enforce data privacy and RBAC, you must deploy the security rules to your Firebase project:

```bash
# Log in to Firebase CLI
firebase login

# Set your active project
firebase use --add <your-project-id>

# Deploy rules
firebase deploy --only firestore:rules,storage
```

### 5. Provisioning the First Owner

When a new user signs up, they are automatically provisioned as a `Member` of the default organization (`default-org-1`). Because security rules prevent users from granting themselves elevated roles, you must manually promote the first user to `Owner` via the Firebase Console:

1. Go to **Firestore Database** in the Firebase Console.
2. Open the `team` collection.
3. Find your user document (by UID).
4. Change the `role` field from `Member` to `Owner`.

Subsequent team management can be done directly from the app's Team page by the Owner or Admins.

## Testing

The project includes a robust testing setup:

- **Unit & Component Tests:** Uses `vitest` and `jsdom`. No real Firebase credentials are required (they are mocked).
  ```bash
  npm run test
  ```
- **Security Rules Tests:** Uses the Firebase Local Emulator Suite to rigorously test Firestore and Storage rules against unauthorized access.
  ```bash
  npm run test:rules
  ```
  *(Requires Java 21+)*

## Deployment

The project is configured for seamless deployment to **Vercel** as a Single Page Application (SPA). The included `vercel.json` ensures client-side routing works correctly.

1. Import the repository into Vercel.
2. In the Vercel project settings, add all the environment variables from your `.env` file.
3. Deploy!

## Contributing

This project enforces [Conventional Commits](https://www.conventionalcommits.org/). Husky is set up to automatically lint your commit messages.

- Use `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Example: `feat(kanban): add drag-and-drop support`
- Pre-commit hooks will automatically run linting, type-checking, and unit tests.
