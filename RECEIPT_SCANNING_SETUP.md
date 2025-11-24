# Receipt Scanning Setup

## Overview

The receipt scanning feature uses the [Vercel AI SDK](https://ai-sdk.dev/) to support multiple AI providers. You can easily switch between providers by changing environment variables - no code changes needed!

## Supported Providers

- **Google (Gemini)** - Default, fast and cost-effective
- **OpenAI (GPT-4o)** - High accuracy
- **Anthropic (Claude)** - Excellent for complex receipts

## Environment Variables

### Quick Start (One API Key Only!)

You only need to add **one API key** for the provider you want to use:

**Option 1: Use Google Gemini (Recommended - Fast & Free)**
```bash
# Default provider, no OCR_PROVIDER needed
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key_here
```

**Option 2: Use OpenAI**
```bash
OCR_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here
```

**Option 3: Use Anthropic Claude**
```bash
OCR_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_key_here
```

### Advanced Configuration

```bash
# Choose your provider (default: google)
OCR_PROVIDER=google  # or "openai" or "anthropic"

# Optional: Override default model
OCR_MODEL=gemini-1.5-pro  # Provider-specific model name
```

## Getting API Keys

### Google (Gemini) - Recommended
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add to `.env.local`

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in and create a new API key
3. Add to `.env.local`

### Anthropic
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Add to `.env.local`

## Example Configuration

**Minimal setup (Google Gemini - default):**
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
```

**Switch to OpenAI:**
```bash
OCR_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
```

**Switch to Anthropic:**
```bash
OCR_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_key
```

**With custom model:**
```bash
OCR_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=your_key
OCR_MODEL=gemini-1.5-pro
```

## Supported Models

### Google
- `gemini-2.0-flash` (default, fastest)
- `gemini-1.5-flash` (fast)
- `gemini-1.5-pro` (more accurate)
- `gemini-2.0-flash-exp` (experimental)

### OpenAI
- `gpt-4o` (default, best for images)
- `gpt-4o-mini` (faster, cheaper)
- `gpt-4-turbo` (alternative)

### Anthropic
- `claude-sonnet-4-20250514` (default, best balance)
- `claude-3-opus-20240229` (most accurate)
- `claude-3-5-haiku-20241022` (fastest)

## Fallback Behavior

- If no API key is set, the app will use mock data (development mode)
- If the API call fails, the app will show an error message to the user
- The "Paste Text" option always works and doesn't require an API key

## Testing

1. **Without API key**: The app will use mock data automatically
2. **With API key**: Upload a receipt image to test real OCR functionality
3. **Switch providers**: Change `OCR_PROVIDER` and restart to test different models
4. **Error cases**: Try uploading invalid files or very large images to test error handling

## Benefits of AI SDK

- **Unified API**: Same code works with all providers
- **Easy Switching**: Change providers via environment variables
- **Type Safety**: Structured outputs with Zod schemas
- **No Parsing**: AI SDK handles JSON parsing automatically
- **Future-Proof**: Easy to add new providers as they become available

