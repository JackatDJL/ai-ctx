# ai-ctx Global Configuration

This directory (`~/.config/ai-ctx/`) stores the global configuration settings for the `ai-ctx` command-line interface.

## `config.json`

The primary configuration file is `config.json`. This file contains settings that apply globally to the `ai-ctx` CLI, such as API keys, default models, or other user preferences that are not specific to a particular project.

The schema for this file is linked within the JSON itself for reference.

## Usage

It is recommended to manage this configuration using the `ai-ctx` CLI commands:

- **`ai-ctx init`**: This command will create the global configuration directory and the `config.json` file with default settings if they do not already exist.
- **`ai-ctx init reset --global`**: This command will reset the global `config.json` file back to its default settings.

Avoid manually editing the `config.json` file unless you are familiar with its structure and the potential impact of changes.
