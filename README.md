# CodeVault - Competitive Programming Archive Platform

A beautiful, modern web application for archiving and managing competitive programming problems from Codeforces, LeetCode, AtCoder, and CodeChef.

## Features

- **Universal Problem Parser**: Automatically extracts problem details from URLs
- **Beautiful Dark UI**: Modern glassmorphism design with dark mode
- **Code Editor**: Integrated Monaco Editor for writing and saving solutions
- **Notes System**: Rich text notes for each problem
- **Problem Vault**: Grid layout dashboard to view all archived problems
- **Math Rendering**: KaTeX support for mathematical formulas in problem statements
- **Multi-Platform Support**: Codeforces, LeetCode, AtCoder, CodeChef

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Code Editor**: Monaco Editor
- **Math Rendering**: KaTeX
- **Scraping**: Cheerio (static), Puppeteer (dynamic)
- **Database**: JSON file-based (easily migratable to PostgreSQL/MongoDB)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd my-app
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Add a Problem**: Paste a problem URL from any supported platform in the input field and click "Add to Vault"
2. **View Problem**: Click on any problem card to view details
3. **Write Solution**: Use the code editor on the right side to write your solution
4. **Add Notes**: Write notes about the problem, algorithm used, or key learnings
5. **Mark as Solved**: Toggle the solved status for each problem

## Supported Platforms

- **Codeforces**: `https://codeforces.com/problemset/problem/*`
- **LeetCode**: `https://leetcode.com/problems/*`
- **AtCoder**: `https://atcoder.jp/contests/*/tasks/*`
- **CodeChef**: `https://www.codechef.com/problems/*`

## Project Structure

```
my-app/
├── app/
│   ├── api/              # API routes
│   ├── components/       # React components
│   ├── problems/         # Problem detail pages
│   └── page.tsx          # Main dashboard
├── lib/
│   ├── parsers/          # Platform-specific parsers
│   ├── db.ts             # Database operations
│   └── types.ts          # TypeScript types
└── data/                 # JSON database files (gitignored)
```

## Database

The application uses a simple JSON file-based database stored in the `data/` directory. This can be easily migrated to PostgreSQL or MongoDB by updating the `lib/db.ts` file.

## Notes

- **Puppeteer**: Required for LeetCode parsing (dynamic content). Make sure Puppeteer is properly installed.
- **Data Storage**: All data is stored locally in JSON files. For production, consider migrating to a proper database.

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

MIT
