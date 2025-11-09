import type { PipelineComponent } from "../core/types";
import { IntentResult } from "../types";

export const extract: PipelineComponent = (
  input: IntentResult,
): IntentResult => {
  // Extract email addresses
  extractEmails(input);
  
  // Extract phone numbers
  extractPhones(input);
  
  // Extract URLs
  extractUrls(input);
  
  // Extract numbers (already handled by tokenizer, but we'll double-check)
  extractNumbers(input);

  return input;
};

function extractEmails(input: IntentResult): void {
  const text = input.text;
  // Use non-anchored regex to match emails within larger strings
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  let match;
  while ((match = emailPattern.exec(text)) !== null) {
    input.entities.push({
      type: 'email',
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
    
    // Prevent infinite loop in case regex doesn't advance
    if (match.index === emailPattern.lastIndex) {
      emailPattern.lastIndex++;
    }
  }
}

function extractPhones(input: IntentResult): void {
  const text = input.text;
  // A simplified approach to find phone numbers without regex
  // Look for sequences of digits with possible separators
  
  // Split the text by delimiters to find potential phone numbers
  const tokens = text.split(/[\s\n\r\t,;()<>[\]{}]+/);
  
  for (const token of tokens) {
    if (!token) continue;
    
    // A phone number typically has 10-15 digits with possible separators
    if (token.length >= 10) {
      let digitCount = 0;
      let separatorCount = 0;
      
      // Count digits and valid phone number separators
      for (const char of token) {
        if (isDigit(char)) {
          digitCount++;
        } else if (['-', '.', ' ', '(', ')', '+'].includes(char)) {
          separatorCount++;
        }
      }
      
      if (digitCount >= 10 && digitCount <= 15 && (digitCount + separatorCount === token.length)) {
        // This may be a phone number
        const start = text.indexOf(token);
        if (start !== -1) {
          input.entities.push({
            type: 'phone',
            value: token,
            start,
            end: start + token.length,
          });
        }
      }
    }
  }
}

function extractUrls(input: IntentResult): void {
  const text = input.text;
  const protocols = ['http://', 'https://'];
  
  for (const protocol of protocols) {
    let searchStart = 0;
    while (searchStart < text.length) {
      const protocolIndex = text.indexOf(protocol, searchStart);
      if (protocolIndex === -1) break;
      
      // Find the end of the URL (space, newline, or end of text)
      let urlEnd = protocolIndex + protocol.length;
      while (urlEnd < text.length) {
        const char = text[urlEnd];
        if (char === undefined || [' ', '\n', '\r', '\t', '<', '>', '(', ')', '[', ']', '{', '}'].includes(char)) {
          break;
        }
        urlEnd++;
      }
      
      const url = text.substring(protocolIndex, urlEnd);
      if (url && isValidUrl(url)) {
        input.entities.push({
          type: 'url',
          value: url,
          start: protocolIndex,
          end: urlEnd,
        });
      }
      
      // Advance search position to avoid infinite loops
      searchStart = urlEnd > searchStart ? urlEnd : searchStart + 1;
    }
  }
}

function isValidUrl(url: string): boolean {
  // Basic validation for URL format
  const parts = url.split('://');
  if (parts.length !== 2) return false;
  
  const protocol = parts[0];
  const path = parts[1];
  
  if (!protocol || !path || !['http', 'https'].includes(protocol)) return false;
  
  // Check for domain-like structure
  const domainPath = path.split('/')[0];
  if (!domainPath) return false;
  
  const domainParts = domainPath.split('.');
  if (domainParts.length < 2) return false;
  
  // Check that domain parts are not empty and have valid characters
  for (const part of domainParts) {
    if (!part || !/^[a-zA-Z0-9-]+$/.test(part)) {
      return false;
    }
  }
  
  return true;
}

function extractNumbers(input: IntentResult): void {
  // Extract numbers using a non-regex approach
  // This finds sequences of digits that might include decimal points
  
  const text = input.text;
  let i = 0;
  
  while (i < text.length) {
    // Find start of a potential number
    while (i < text.length) {
      const currentChar = text[i];
      if (currentChar !== undefined && (isDigit(currentChar) || currentChar === '.')) {
        break;
      }
      i++;
    }
    
    if (i >= text.length) break;
    
    let start = i;
    let hasDecimal = false;
    
    // Extract the number
    while (i < text.length) {
      const char = text[i];
      if (char === undefined) {
        break;
      }
      
      if (isDigit(char)) {
        i++;
      } else if (char === '.' && !hasDecimal) {
        // Check if this is actually a decimal point or just a separator
        // by looking at what comes before and after
        const prevChar = text[i - 1];
        const nextChar = text[i + 1];
        if (i > 0 && prevChar !== undefined && isDigit(prevChar) && 
            i < text.length - 1 && nextChar !== undefined && isDigit(nextChar)) {
          hasDecimal = true;
          i++;
        } else {
          break; // Not a decimal point in a number
        }
      } else {
        break; // End of number
      }
    }
    
    if (i > start) {
      const numberValue = text.substring(start, i);
      
      // Validate that this is indeed a number (not just a digit in a larger string)
      if (isNumber(numberValue)) {
        input.entities.push({
          type: 'number',
          value: numberValue,
          start,
          end: i,
        });
      }
    }
  }
}

function isDigit(char: string | undefined): boolean {
  if (char === undefined) return false;
  return char >= '0' && char <= '9';
}

function isNumber(str: string): boolean {
  return !isNaN(parseFloat(str)) && isFinite(parseFloat(str));
}
