module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/en',
        'http://localhost:3000/en/login',
      ],
      numberOfRuns: 1,
      startServerCommand: 'npm start -- -p 3000',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 120000,
      settings: {
        chromePath: '/usr/bin/chromium',
        chromeFlags: '--no-sandbox --headless=new --disable-dev-shm-usage',
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'unused-javascript': ['warn', { maxLength: 200 }],
        'uses-text-compression': 'off',
        'is-on-https': 'off',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
