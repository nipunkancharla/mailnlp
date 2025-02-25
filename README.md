# Email Deadline Tracker

A Google Apps Script project that processes Gmail inbox emails to extract deadlines and event details related to internships, hackathons, and placements, then logs them into a Google Sheet. It uses the Hugging Face Inference API for NLP-based summarization and Named Entity Recognition (NER) to identify dates, with fallback regex for robustness.

## Features
- **Email Filtering**: Scans inbox emails from the last 24 hours for keywords ("internship", "hackathon", "placement").
- **Deadline Detection**: Uses NER (`dslim/bert-base-NER`) to find dates, prioritizing those near "due", "deadline", etc., with regex fallback.
- **Summarization**: Generates summaries using Hugging Face’s `facebook/bart-large-cnn` model.
- **Google Form Links**: Extracts and logs Google Form URLs from emails.
- **Google Sheets Output**: Logs event title, date, time, summary, and form link to a specified Sheet.
- **Automation**: Runs daily between 12 AM and 1 AM via a time-driven trigger.
- **Default Behavior**: If no deadline is found, logs the event for today.

## Prerequisites
- A Google account with access to Gmail, Google Sheets, and Google Apps Script.
- A Hugging Face account and API token (free tier available).
- Basic familiarity with Google Apps Script and GitHub.

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/email-deadline-tracker.git
cd email-deadline-tracker
```

### 2. Create a Google Sheet
1. Go to [sheets.google.com](https://sheets.google.com/) and create a new spreadsheet.
2. In row 1, add these headers:
   - `A1`: Title
   - `B1`: Date
   - `C1`: Time
   - `D1`: Summary
   - `E1`: Form Link
3. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`.

### 3. Set Up Google Apps Script
1. Go to [script.google.com](https://script.google.com/).
2. Create a new project and name it (e.g., "Email Deadline Tracker").
3. Replace the default code with the contents of `Code.gs` from this repo.
4. Update the following variables in `Code.gs`:
   - `var apiToken = "your-hugging-face-api-token";`: Replace with your Hugging Face API token (get it from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)).
   - `var sheetId = "your-google-sheet-id";`: Replace with your Sheet ID from step 2.

### 4. Authorize the Script
1. Click "Run" > "Run function" > `extractDatesAndAddToSheet`.
2. Follow the authorization prompts to grant access to Gmail and Google Sheets.

### 5. Set Up Daily Automation
1. In the script editor, click the clock icon (Triggers) on the left.
2. Click "+ Add Trigger":
   - **Function**: `extractDatesAndAddToSheet`
   - **Deployment**: Head
   - **Event Source**: Time-driven
   - **Type**: Day timer
   - **Time**: Midnight to 1 AM
3. Save the trigger.

## Usage
- The script runs daily at 12–1 AM, scanning your inbox for emails from the last 24 hours (`newer_than:1d`).
- It processes emails containing "internship", "hackathon", or "placement".
- Results are appended to your Google Sheet with:
  - **Title**: Email subject (up to 50 characters).
  - **Date**: Detected deadline or today’s date if none found.
  - **Time**: Event time (if detected, e.g., "3:00 PM").
  - **Summary**: NLP-generated summary of the email thread.
  - **Form Link**: Google Form URL (if present).

### Example Output
| Title                | Date       | Time    | Summary                          | Form Link                              |
|----------------------|------------|---------|----------------------------------|----------------------------------------|
| Internship Deadline  | 03/20/2025 | 3:00 PM | Submit application by 03/20.    | https://docs.google.com/forms/d/e/abc123 |
| Hackathon Soon       | 02/25/2025 |         | Hackathon details, no deadline. |                                        |

## How It Works
1. **Email Fetching**: Uses `GmailApp.search("in:inbox newer_than:1d")` to get recent inbox threads.
2. **NLP Processing**:
   - **Summarization**: Calls Hugging Face’s `facebook/bart-large-cnn` API to summarize email threads (up to 1000 characters).
   - **NER**: Uses `dslim/bert-base-NER` to detect DATE entities, prioritizing deadlines with context clues ("due", "deadline").
3. **Fallback**: If NER misses, regex searches for dates near deadline keywords.
4. **Logging**: Appends data to a Google Sheet using `SpreadsheetApp`.

## Limitations
- **Hugging Face API**: Free tier limits requests (~30/hour) and input size (1000 chars), potentially missing deadlines in long threads.
- **NER Accuracy**: May miss non-standard dates (e.g., "next Friday"); regex fallback helps but isn’t perfect.
- **Duplicates**: `newer_than:1d` reduces repeats, but emails near midnight might slip through—consider adding message ID tracking.
- **Privacy**: Sending email data to Hugging Face involves third-party risks; sanitize sensitive info or switch to local processing.

## Troubleshooting
- **No Deadlines Found**:
  - Check logs (`View > Logs`) for NER results.
  - Ensure email text fits within 1000 chars or adjust the limit.
- **API Errors**: Rate limit exceeded? Wait an hour or reduce `threads.length`.
- **Sheet Not Updating**: Verify `sheetId` and authorization.

## Future Enhancements
- Add duplicate prevention using `PropertiesService` to track processed message IDs.
- Integrate PDF attachment parsing for deadlines in files.
- Switch to Python/Colab for local NLP with Hugging Face Transformers (privacy-focused).

## Contributing
Feel free to fork this repo, submit issues, or pull requests! Suggestions for better NER models or regex patterns welcome.

## License
MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments
- Built with Google Apps Script and Hugging Face Inference API.
- Inspired by a student’s need to track internship and hackathon deadlines.

