import fs from 'fs';
import path from 'path';
import { defaultConfig, type MiniparseConfig } from './defaults';

export class ConfigLoader {
  private static readonly CONFIG_FILE_NAME = 'miniparse.config.yaml';
  private static readonly DEFAULT_CONFIG_FILE_NAME = 'default.yaml';

  /**
   * Loads the configuration from various sources with the following priority:
   * 1. Custom config file in the current working directory
   * 2. Default config file in the project
   * 3. Built-in defaults
   */
  public static loadConfig(customConfigPath?: string): MiniparseConfig {
    // Try to load custom config first
    if (customConfigPath && fs.existsSync(customConfigPath)) {
      return this.loadConfigFromFile(customConfigPath);
    }

    // Try to find config in current working directory
    const localConfigPath = path.join(process.cwd(), this.CONFIG_FILE_NAME);
    if (fs.existsSync(localConfigPath)) {
      return this.loadConfigFromFile(localConfigPath);
    }

    // Try to find default config in project
    // __dirname will be in dist/config after compilation, so go up two levels to project root
    const defaultConfigPath = path.join(__dirname, '../..', this.DEFAULT_CONFIG_FILE_NAME);
    if (fs.existsSync(defaultConfigPath)) {
      return this.loadConfigFromFile(defaultConfigPath);
    }

    // Return built-in defaults
    return JSON.parse(JSON.stringify(defaultConfig)); // Create a deep copy to avoid reference issues
  }

  private static loadConfigFromFile(filePath: string): MiniparseConfig {
    try {
      // Since we want to avoid dependencies like js-yaml, we'll implement a basic YAML parser
      // For now, we'll use JSON as a fallback if YAML parsing isn't available
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      
      // Basic YAML to JSON conversion for simple cases
      const configObject = this.parseYAMLToJSON(fileContent);
      
      // Merge with defaults to ensure all fields are present
      return this.mergeConfigWithDefaults(configObject);
    } catch (error) {
      console.warn(`Failed to load config from ${filePath}:`, error);
      console.warn('Falling back to default configuration');
      return JSON.parse(JSON.stringify(defaultConfig));
    }
  }

  private static parseYAMLToJSON(yamlStr: string): Partial<MiniparseConfig> {
    // This is a simplified YAML parser that handles basic indentation-based structure
    // It doesn't handle all YAML features but covers the most common ones
    const lines = yamlStr.split('\n');
    const result: any = {};
    const stack: any[] = [result]; // Stack to keep track of nested objects
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue; // Skip empty lines and comments
      
      // Match key-value pairs (both nested and top-level)
      const match = line.match(/^(\s*)([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (match && match[1] !== undefined && match[2] !== undefined && match[3] !== undefined) {
        const indent = match[1].length;
        const key = match[2];
        const value = match[3].trim();
        
        // Adjust stack based on indentation level
        while (stack.length > 1) {
          const currentIndentLevel = getIndentLevel(stack[stack.length - 1]);
          if (indent < currentIndentLevel) {
            stack.pop();
          } else {
            break;
          }
        }
        
        const currentObj = stack[stack.length - 1];
        if (!currentObj) continue; // Safety check
        
        if (value === '') {
          // This is a nested object
          currentObj[key] = {};
          const newObj = currentObj[key];
          if (newObj) {
            stack.push(newObj);
            setIndentLevel(newObj, indent);
          }
        } else {
          // This is a value
          // Try to parse as boolean, number, or string
          currentObj[key] = this.parseYAMLValue(value);
        }
      }
    }
    
    return result;
  }

  private static parseYAMLValue(value: string): any {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    
    // Check if it's a number
    const num = Number(value);
    if (!isNaN(num)) return num;
    
    // It's a string, remove quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.substring(1, value.length - 1);
    }
    
    return value;
  }

  private static mergeConfigWithDefaults(partialConfig: Partial<MiniparseConfig>): MiniparseConfig {
    // Start with a deep copy of defaults
    const config: any = JSON.parse(JSON.stringify(defaultConfig));
    
    // Apply the partial config values
    this.deepMerge(config, partialConfig);
    
    return config as MiniparseConfig;
  }

  private static deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source && source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          this.deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }
}

// Helper functions for YAML parsing
const indentLevels = new WeakMap<object, number>();

function getIndentLevel(obj: object): number {
  return indentLevels.get(obj) || 0;
}

function setIndentLevel(obj: object, level: number): void {
  indentLevels.set(obj, level);
}