import { FC, useState, useEffect } from "react";
import { useUnit } from "effector-react";

import {
  $geminiApiKeyModalOpen,
  geminiApiKeyModalClosed,
  $geminiApiKey,
  geminiApiKeyChanged,
  $geminiModel,
  geminiModelChanged,
} from "@src/models/settings";

export const GeminiApiKeyModal: FC = () => {
  const [
    isModalOpen,
    handleModalClose,
    currentApiKey,
    handleApiKeyChange,
    currentModel,
    handleModelChange,
  ] = useUnit([
    $geminiApiKeyModalOpen,
    geminiApiKeyModalClosed,
    $geminiApiKey,
    geminiApiKeyChanged,
    $geminiModel,
    geminiModelChanged,
  ]);

  const [tempApiKey, setTempApiKey] = useState(currentApiKey);
  const [tempModel, setTempModel] = useState(currentModel);

  useEffect(() => {
    if (isModalOpen) {
      setTempApiKey(currentApiKey);
      setTempModel(currentModel);
    }
  }, [isModalOpen, currentApiKey, currentModel]);

  const handleSave = () => {
    handleApiKeyChange(tempApiKey);
    handleModelChange(tempModel);
    handleModalClose();
  };

  const handleCancel = () => {
    setTempApiKey(currentApiKey);
    setTempModel(currentModel);
    handleModalClose();
  };

  if (!isModalOpen) {
    return null;
  }

  return (
    <div className="es-modal-overlay">
      <div className="es-modal-content">
        <div className="es-modal-header">
          <h3>Gemini API Key Configuration</h3>
          <button className="es-modal-close" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="es-modal-body">
          <div className="es-modal-field">
            <label htmlFor="gemini-api-key">API Key:</label>
            <input
              id="gemini-api-key"
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="es-modal-input"
            />
          </div>

          <div className="es-modal-field">
            <label htmlFor="gemini-model">Model:</label>
            <input
              id="gemini-model"
              type="text"
              value={tempModel}
              onChange={(e) => setTempModel(e.target.value)}
              placeholder="e.g., gemini-2.0-flash-exp, gemini-1.5-flash, gemini-1.5-pro"
              className="es-modal-input"
            />
          </div>

          <div className="es-modal-info">
            <p>
              Gemini API key is required for translation. Please enter your
              Google AI Studio API key and choose a model to use this service.
            </p>
            <p>
              Get your Gemini API key at{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
              >
                aistudio.google.com/app/apikey
              </a>
            </p>
            <p>
              Recommended models:
              <br />
              • <strong>gemini-2.0-flash-exp</strong> - Latest experimental model (default)
              <br />
              • <strong>gemini-1.5-flash</strong> - Fast and cost-effective
              <br />
              • <strong>gemini-1.5-pro</strong> - Higher quality translations
              <br />
              • <strong>gemini-exp-1206</strong> - Experimental advanced model
            </p>
            <p>
              Note: Usage is based on Google's pricing model. Monitor your usage
              to avoid unexpected charges.
            </p>
          </div>
        </div>

        <div className="es-modal-footer">
          <button
            className="es-modal-button es-modal-button--secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="es-modal-button es-modal-button--primary"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
