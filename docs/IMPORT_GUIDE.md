# Import Conversations Guide

Import your conversation history from ChatGPT or Claude into SML Guardian. Your data will be stored locally and never leaves your device.

---

## Quick Start

1. **Open Settings** → Click ⚙️ Settings button
2. **Go to Data Tab** → Click the "Data" tab
3. **Select Format** → Choose ChatGPT, Claude, or Auto-Detect
4. **Upload File** → Select your JSON export file
5. **Wait for Import** → View import statistics
6. **Refresh** → Reload page to see imported conversations

---

## Export from ChatGPT

### Step 1: Request Your Data

1. Go to [ChatGPT Settings](https://chat.openai.com/settings)
2. Navigate to **Data Controls**
3. Click **"Export data"**
4. Confirm your email address

### Step 2: Download Export

1. Wait for email from OpenAI (usually within minutes)
2. Click the download link in the email
3. Download the ZIP file
4. Extract the ZIP file

### Step 3: Import to SML Guardian

1. Locate `conversations.json` in the extracted folder
2. Open SML Guardian Settings → Data tab
3. Select "ChatGPT" format (or Auto-Detect)
4. Upload `conversations.json`
5. Wait for import to complete

---

## Export from Claude

### Step 1: Request Export

1. Go to [Claude Settings](https://claude.ai/settings)
2. Navigate to **Data & Privacy**
3. Click **"Export conversations"**
4. Wait for download to start

### Step 2: Import to SML Guardian

1. Locate the downloaded JSON file
2. Open SML Guardian Settings → Data tab
3. Select "Claude" format (or Auto-Detect)
4. Upload the JSON file
5. Wait for import to complete

---

## Import Options

### Preserve Original Timestamps
- **Enabled (Recommended)**: Keeps the original conversation dates
- **Disabled**: Uses current date/time for all imported messages

### Skip Duplicates
- **Enabled (Recommended)**: Prevents importing the same conversation twice
- **Disabled**: Imports all conversations, even if they already exist

---

## What Gets Imported

### ChatGPT Export Format

**Imported:**
- ✅ Conversation titles
- ✅ All messages (user and assistant)
- ✅ Original timestamps
- ✅ Conversation structure

**Not Imported:**
- ❌ Attachments/images
- ❌ Code interpreter results
- ❌ Plugin data
- ❌ Regenerated messages (only final version imported)

### Claude Export Format

**Imported:**
- ✅ Conversation names
- ✅ All messages (human and assistant)
- ✅ Original timestamps
- ✅ Message order

**Not Imported:**
- ❌ Attachments
- ❌ Message edits history

---

## Import Results

After import completes, you'll see:

### Success Statistics
- Number of conversations imported
- Number of messages imported

### Errors
- List of conversations that failed to import
- Reason for each failure

### Warnings
- Messages that were skipped
- Minor issues that didn't prevent import

---

## Troubleshooting

### Import Failed: "Invalid JSON format"

**Cause**: File is corrupted or not valid JSON

**Solutions**:
1. Re-export from ChatGPT/Claude
2. Verify file is not empty
3. Try opening file in text editor to check format
4. Ensure file extension is `.json`

### Import Failed: "Unknown format"

**Cause**: File format not recognized

**Solutions**:
1. Select specific format (ChatGPT or Claude) instead of Auto-Detect
2. Verify you downloaded the correct export file
3. Check file contents match expected format

### Import Completed with Errors

**Cause**: Some conversations failed to import

**Solutions**:
1. Check error messages for specific issues
2. Conversations that failed won't be imported
3. Successfully imported conversations are still saved
4. Try re-exporting problematic conversations separately

### Imported Conversations Not Showing

**Cause**: Page needs refresh to show new data

**Solutions**:
1. Click "Refresh to See Imported Conversations" button
2. Or manually reload the page (Ctrl/Cmd + R)
3. Check conversation sidebar for new conversations

### Large File Import Slow

**Cause**: Many conversations with lots of messages

**Solutions**:
1. Be patient - large imports take time
2. Don't close the browser during import
3. Import will complete in background
4. Consider splitting large exports into smaller batches

---

## File Format Details

### ChatGPT Format (conversations.json)

```json
[
  {
    "title": "Conversation Title",
    "create_time": 1234567890,
    "update_time": 1234567890,
    "mapping": {
      "message-id": {
        "id": "message-id",
        "message": {
          "author": { "role": "user" },
          "content": { "parts": ["Message text"] },
          "create_time": 1234567890
        }
      }
    }
  }
]
```

### Claude Format

```json
[
  {
    "uuid": "conversation-uuid",
    "name": "Conversation Name",
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:30:00Z",
    "chat_messages": [
      {
        "uuid": "message-uuid",
        "text": "Message text",
        "sender": "human",
        "created_at": "2024-01-01T12:00:00Z"
      }
    ]
  }
]
```

---

## Data Privacy

### Local Processing
- All import processing happens in your browser
- Data never sent to external servers
- Files not uploaded to cloud

### Storage
- Imported conversations stored in local IndexedDB
- Same security as native SML Guardian conversations
- Can be exported anytime

### Metadata
- Import marks messages with `imported_chatgpt` or `imported_claude` module
- Original IDs and timestamps stored in trace data
- No external tracking or analytics

---

## Tips for Best Results

### Before Importing

1. **Clean Export**: Request fresh export from ChatGPT/Claude
2. **Check Size**: Large exports (1000+ conversations) take longer
3. **Backup**: Export your current SML Guardian data first
4. **Close Other Tabs**: Free up browser resources

### After Importing

1. **Verify**: Check imported conversations look correct
2. **Test Search**: Verify search works across imported data
3. **Check Analytics**: ARI/RDI metrics calculated for imported messages
4. **Backup**: Export database to save imported data

### Multiple Imports

- Safe to import multiple times (duplicates skipped)
- Can import from both ChatGPT and Claude
- Newer exports replace older versions
- Each import is independent

---

## Technical Details

### Supported Formats

| Source | Format | Version | Status |
|--------|--------|---------|--------|
| ChatGPT | OpenAI Export JSON | All | ✅ Supported |
| Claude | Anthropic Export JSON | All | ✅ Supported |

### Mapping Details

**Roles:**
- ChatGPT "user" → SML Guardian "user"
- ChatGPT "assistant" → SML Guardian "assistant"
- ChatGPT "system" → SML Guardian "system"
- Claude "human" → SML Guardian "user"
- Claude "assistant" → SML Guardian "assistant"

**Timestamps:**
- ChatGPT uses Unix seconds → Converted to milliseconds
- Claude uses ISO 8601 strings → Parsed to milliseconds
- SML Guardian stores Unix milliseconds

**Content:**
- ChatGPT parts array → Joined with newlines
- Claude text → Used directly
- Markdown formatting preserved

---

## Limitations

### Current Limitations

- No image import (text only)
- No attachment support
- Tree structure flattened (only main conversation path)
- No message edit history
- No code execution results

### Future Features (Planned)

- ✨ Image attachment import
- ✨ PDF conversation history import
- ✨ Batch import progress indicators
- ✨ Selective conversation import
- ✨ Duplicate detection improvements
- ✨ Import from other platforms (Bard, etc.)

---

## FAQ

### Can I import from both ChatGPT and Claude?

Yes! Import files from both sources. They'll be stored separately and can coexist.

### Will importing delete my existing conversations?

No. Importing adds new conversations without affecting existing ones.

### Can I undo an import?

Currently no automatic undo. You can:
1. Manually delete imported conversations
2. Restore from database backup (if created before import)
3. Use database reset utility (deletes everything)

### How long does import take?

- Small (1-10 conversations): < 1 second
- Medium (10-100 conversations): 1-5 seconds
- Large (100-1000 conversations): 5-30 seconds
- Very Large (1000+ conversations): 30+ seconds

### What's the file size limit?

- Browser memory dependent
- Tested up to 50 MB (thousands of conversations)
- Larger files may work but take longer
- Consider splitting very large exports

### Does import work offline?

Yes! Import is entirely local. No internet required.

---

## Support

### Need Help?

1. Check error messages in import results
2. Verify export file format matches expected structure
3. Try Auto-Detect if unsure about format
4. Report issues on GitHub with:
   - Error message
   - File size
   - Number of conversations
   - Browser/OS version

### Reporting Bugs

Include:
- Import source (ChatGPT/Claude)
- Error message (without sensitive data)
- File size and conversation count
- Browser console logs

---

*Last Updated: Sprint 14 - Import Feature*
