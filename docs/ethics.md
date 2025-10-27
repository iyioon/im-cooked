# Ethics & Responsible AI Usage

## Our Commitment

**I'm Cooked** is committed to ethical AI practices and responsible use of web scraping technology. We prioritize user safety, data integrity, and respect for content creators.

---

## AI Safety Measures

### 1. Prompt Injection Prevention

We protect against malicious AI manipulation through:

- **Input Sanitization**: All scraped recipe data is sanitized before being sent to our AI model
  - Character limits enforced (titles: 500 chars, descriptions: 2000 chars)
  - Array size restrictions (max 100 ingredients, 100 steps)
  - Suspicious pattern detection (blocks `<script>`, `IGNORE PREVIOUS`, system commands)

- **Output Validation**: AI-generated responses are validated before being saved
  - XSS pattern detection in all text fields
  - URL format validation for images and sources
  - Required field verification to ensure data completeness

**Why This Matters**: Prevents attackers from manipulating our AI to generate malicious content, inject scripts, or bypass our normalization logic.

---

## Web Scraping Ethics

### 2. Respectful Scraping Practices

- **Allowlist-Only Access**: We only scrape from 7 pre-approved, major recipe websites
- **Rate Limiting**: Maximum 5 scrape requests per minute per user
  - Prevents overwhelming recipe sites with traffic
  - Protects against abuse of our service
  - Reduces our Gemini API costs

- **Public Attribution**: All recipes maintain source links and author attribution
- **No Commercial Resale**: Recipes are for personal collection only

### 3. SSRF Protection

We prevent Server-Side Request Forgery attacks:

- **Strict Domain Validation**: Only HTTPS URLs from allowed recipe sites
- **Private IP Blocking**: Cannot scrape localhost or internal network addresses
- **Subdomain Verification**: Prevents domain spoofing (e.g., `evil-allrecipes.com.attacker.com`)

**Why This Matters**: Prevents attackers from using our service to scan internal networks or access restricted resources.

---

## Data Protection

### 4. User Privacy

- **No Personal Data Collection**: We don't require user accounts or collect personal information
- **No Tracking**: No analytics or user behavior tracking
- **Transparent Storage**: All recipes stored temporarily in memory (cleared on restart)

### 5. Data Integrity

- **Size Limits**: Request bodies limited to 1MB to prevent abuse
- **Storage Caps**: Maximum 1000 recipes in memory (FIFO eviction)
- **Content Security**: All recipe data validated and sanitized

---

## Security Best Practices

### 6. Defense in Depth

Multiple layers of security protection:

1. **Network Layer**: Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
2. **Application Layer**: Rate limiting, input validation, SSRF protection
3. **Data Layer**: Sanitization, output validation, size restrictions
4. **AI Layer**: Prompt injection prevention, response validation

### 7. Error Handling

- **No Information Disclosure**: Error messages don't reveal internal implementation
- **Server-Side Logging**: Full error details logged for debugging (not sent to clients)
- **Generic Responses**: Production errors use safe, generic messages

---

## Responsible AI Principles

We follow these core principles:

1. **Transparency**: Open about our AI usage (Gemini 1.5 Flash for recipe normalization)
2. **Accountability**: Security measures logged and auditable
3. **Fairness**: Equal rate limits for all users, no preferential treatment
4. **Safety**: Multiple validation layers to prevent malicious content
5. **Respect**: Proper attribution to recipe creators and their websites

---

## Limitations & Disclaimers

### What We Don't Do

- ❌ We do **not** bypass paywalls or access premium content
- ❌ We do **not** scrape copyrighted images without attribution
- ❌ We do **not** modify or alter recipe content beyond formatting
- ❌ We do **not** use scraped data for commercial purposes
- ❌ We do **not** allow scraping of arbitrary websites

### What We Do

- ✅ Extract publicly available recipe data using standard web protocols
- ✅ Normalize recipes into a consistent format for personal use
- ✅ Maintain source attribution and links to original recipes
- ✅ Respect rate limits and server resources
- ✅ Implement comprehensive security measures

---

## Reporting Issues

If you discover a security vulnerability or ethical concern:

1. **Do Not** create a public GitHub issue
2. Report directly to the maintainers (see contact info in README)
3. Include detailed steps to reproduce the issue
4. Allow reasonable time for fixes before public disclosure

---

## Compliance

### Technical Standards

- ✅ **OWASP Top 10**: Protection against common web vulnerabilities
- ✅ **SSRF Prevention**: Strict URL validation and allowlisting
- ✅ **XSS Prevention**: Input/output sanitization and CSP headers
- ✅ **Rate Limiting**: Prevents abuse and DoS attacks
- ✅ **Prompt Injection**: AI input sanitization and output validation

### Legal Compliance

- **robots.txt**: We respect robots.txt directives (scraping is manual via user input)
- **Terms of Service**: Users must comply with recipe sites' ToS
- **Fair Use**: Recipe data collection for personal, non-commercial use
- **Attribution**: All sources properly credited

---

## Continuous Improvement

Our security and ethics practices evolve with:

- Regular security audits
- Dependency vulnerability scanning
- Community feedback and reporting
- Industry best practices updates

**Last Updated**: October 27, 2025

---

*We believe in building AI-powered tools that are safe, ethical, and respectful of both users and content creators.*
