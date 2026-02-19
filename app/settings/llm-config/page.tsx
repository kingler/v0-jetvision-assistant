'use client';

/**
 * Admin LLM Configuration Settings Page
 * 
 * Allows administrators to configure LLM provider settings including:
 * - OpenAI API key management
 * - Model selection and parameters
 * - Default configuration settings
 * 
 * Access: Admin-only (enforced via middleware and UI checks)
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useUserRole } from '@/lib/hooks/use-user-role';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, TestTube, Key, Settings, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface LLMConfig {
  id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'azure';
  provider_name: string;
  has_api_key: boolean;
  default_model: string;
  available_models: string[];
  default_temperature: number;
  default_max_tokens: number;
  default_top_p: number;
  default_frequency_penalty: number;
  default_presence_penalty: number;
  organization_id?: string;
  is_active: boolean;
  is_default: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_MODELS = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-5'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  google: ['gemini-pro', 'gemini-ultra'],
  azure: ['gpt-4', 'gpt-35-turbo'],
};

export default function LLMConfigPage() {
  const { user, isLoaded } = useUser();
  const { role, loading: roleLoading, hasPermission } = useUserRole();
  const router = useRouter();

  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message?: string } | null>(null);

  /**
   * Safely parses a numeric input value, falling back to a default when NaN
   * Prevents storing NaN in form state when inputs are empty or invalid
   * @param value - The string value from the input field
   * @param fallback - The fallback value to use if parsing results in NaN
   * @param parser - The parsing function to use (parseFloat or parseInt)
   * @returns The parsed number or the fallback value
   */
  const safeParseNumeric = (
    value: string,
    fallback: number,
    parser: (val: string) => number = parseFloat
  ): number => {
    const parsed = parser(value);
    return isNaN(parsed) ? fallback : parsed;
  };

  // Form state - derive available_models from AVAILABLE_MODELS constant
  const initialProvider: 'openai' | 'anthropic' | 'google' | 'azure' = 'openai';
  const initialAvailableModels = AVAILABLE_MODELS[initialProvider];
  const [formData, setFormData] = useState<{
    provider: 'openai' | 'anthropic' | 'google' | 'azure';
    provider_name: string;
    api_key: string;
    default_model: string;
    available_models: string[];
    default_temperature: number;
    default_max_tokens: number;
    default_top_p: number;
    default_frequency_penalty: number;
    default_presence_penalty: number;
    organization_id: string;
    is_active: boolean;
    is_default: boolean;
  }>({
    provider: initialProvider,
    provider_name: 'OpenAI',
    api_key: '',
    default_model: initialAvailableModels[0] || 'gpt-4',
    available_models: initialAvailableModels,
    default_temperature: 0.7,
    default_max_tokens: 8192,
    default_top_p: 1.0,
    default_frequency_penalty: 0.0,
    default_presence_penalty: 0.0,
    organization_id: '',
    is_active: true,
    is_default: false,
  });

  // Check admin access
  useEffect(() => {
    if (isLoaded && roleLoading === false) {
      if (role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        router.push('/');
      }
    }
  }, [isLoaded, roleLoading, role, router]);

  // Fetch configurations
  useEffect(() => {
    async function fetchConfigs() {
      if (!isLoaded || role !== 'admin') return;

      try {
        setLoading(true);
        const response = await fetch('/api/admin/llm-config');
        
        if (!response.ok) {
          throw new Error('Failed to fetch LLM configuration');
        }

        const result = await response.json();
        setConfigs(result.data || []);
        
        // Set form to default config if exists
        const defaultConfig = result.data?.find((c: LLMConfig) => c.is_default);
        if (defaultConfig) {
          // Ensure default_model is in available_models, fallback to first available model
          // Type guard to ensure provider is a valid key for AVAILABLE_MODELS
          const provider = defaultConfig.provider as keyof typeof AVAILABLE_MODELS;
          const availableModels = defaultConfig.available_models || AVAILABLE_MODELS[provider] || [];
          const validDefaultModel = availableModels.includes(defaultConfig.default_model)
            ? defaultConfig.default_model
            : availableModels[0] || AVAILABLE_MODELS[provider]?.[0] || 'gpt-4';
          
          setFormData({
            provider: defaultConfig.provider,
            provider_name: defaultConfig.provider_name,
            api_key: '', // Never pre-fill API key for security
            default_model: validDefaultModel,
            available_models: availableModels,
            default_temperature: defaultConfig.default_temperature,
            default_max_tokens: defaultConfig.default_max_tokens,
            default_top_p: defaultConfig.default_top_p,
            default_frequency_penalty: defaultConfig.default_frequency_penalty,
            default_presence_penalty: defaultConfig.default_presence_penalty,
            organization_id: defaultConfig.organization_id || '',
            is_active: defaultConfig.is_active,
            is_default: defaultConfig.is_default,
          });
        }
      } catch (error) {
        console.error('Error fetching LLM config:', error);
        toast.error('Failed to load LLM configuration');
      } finally {
        setLoading(false);
      }
    }

    fetchConfigs();
  }, [isLoaded, role]);

  // Test API key
  const handleTestKey = async () => {
    if (!formData.api_key) {
      toast.error('Please enter an API key to test');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/llm-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formData.provider,
          api_key: formData.api_key,
          organization_id: formData.organization_id || undefined,
        }),
      });

      const result = await response.json();

      if (result.valid) {
        setTestResult({ valid: true, message: result.message || 'API key is valid' });
        toast.success('API key test successful');
        
        // Update available models if returned
        if (result.available_models && result.available_models.length > 0) {
          setFormData(prev => ({
            ...prev,
            available_models: result.available_models,
            default_model: result.available_models[0] || prev.default_model,
          }));
        }
      } else {
        setTestResult({ valid: false, message: result.error || result.details || 'API key test failed' });
        toast.error(result.error || 'API key test failed');
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      setTestResult({ valid: false, message: 'Failed to test API key' });
      toast.error('Failed to test API key');
    } finally {
      setTesting(false);
    }
  };

  // Save configuration
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.api_key && !configs.find(c => c.provider === formData.provider && c.has_api_key)) {
      toast.error('API key is required for new configurations');
      return;
    }

    setSaving(true);

    try {
      const existingConfig = configs.find(c => c.provider === formData.provider);
      const method = existingConfig ? 'PUT' : 'POST';
      const url = existingConfig 
        ? '/api/admin/llm-config'
        : '/api/admin/llm-config';

      const payload: Record<string, unknown> = {
        ...formData,
        api_key: formData.api_key || undefined, // Only include if provided
      };

      if (existingConfig) {
        payload.id = existingConfig.id;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Safely parse error response - may be JSON, HTML, or plain text
        // Read as text first to avoid body consumption issues, then try JSON parse
        let errorBody: string | Record<string, unknown>;
        let errorMessage = 'Failed to save configuration';
        
        try {
          // Read response body as text (can only be read once)
          const textBody = await response.text();
          
          // Attempt to parse text as JSON
          try {
            errorBody = JSON.parse(textBody);
            if (typeof errorBody === 'object' && errorBody !== null) {
              errorMessage = (errorBody as { error?: string; details?: string }).error || 
                            (errorBody as { error?: string; details?: string }).details || 
                            errorMessage;
            }
          } catch (jsonError) {
            // JSON parsing failed - use text body as-is
            errorBody = textBody;
            errorMessage = textBody.trim() || errorMessage;
          }
        } catch (textError) {
          // Text reading also failed - use generic message with status
          errorBody = 'Unable to read error response';
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        // Create error with status and body for debugging
        const error = new Error(errorMessage);
        (error as Error & { status?: number; body?: string | Record<string, unknown> }).status = response.status;
        (error as Error & { status?: number; body?: string | Record<string, unknown> }).body = errorBody;
        throw error;
      }

      const result = await response.json();
      toast.success(result.message || 'Configuration saved successfully');
      
      // Refresh configurations
      const refreshResponse = await fetch('/api/admin/llm-config');
      if (refreshResponse.ok) {
        const refreshResult = await refreshResponse.json();
        setConfigs(refreshResult.data || []);
      }

      // Clear API key from form after successful save
      setFormData(prev => ({ ...prev, api_key: '' }));
      setTestResult(null);
    } catch (error) {
      console.error('Error saving LLM config:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading || roleLoading || !isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Not admin
  if (role !== 'admin') {
    return null;
  }

  const defaultConfig = configs.find(c => c.is_default);

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Settings className="h-8 w-8" />
          LLM Provider Configuration
        </h1>
        <p className="text-muted-foreground">
          Configure LLM provider settings and API keys (Admin only)
        </p>
      </div>

      {/* Current Configuration Status */}
      {defaultConfig && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Current Default Configuration</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p>
                <strong>Provider:</strong> {defaultConfig.provider_name} ({defaultConfig.provider})
              </p>
              <p>
                <strong>Model:</strong> {defaultConfig.default_model}
              </p>
              <p>
                <strong>Status:</strong>{' '}
                <Badge variant={defaultConfig.is_active ? 'default' : 'secondary'}>
                  {defaultConfig.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </p>
              {defaultConfig.has_api_key && (
                <p className="text-success">
                  <Key className="h-3 w-3 inline mr-1" />
                  API key configured
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>LLM Configuration</CardTitle>
          <CardDescription>
            Configure LLM provider settings. API keys are encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value: 'openai' | 'anthropic' | 'google' | 'azure') => {
                  setFormData(prev => ({
                    ...prev,
                    provider: value,
                    provider_name: value === 'openai' ? 'OpenAI' : 
                                  value === 'anthropic' ? 'Anthropic' :
                                  value === 'google' ? 'Google' : 'Azure OpenAI',
                    default_model: AVAILABLE_MODELS[value][0] || 'gpt-4',
                    available_models: AVAILABLE_MODELS[value] || [],
                  }));
                }}
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="azure">Azure OpenAI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="api_key">
                API Key
                {configs.find(c => c.provider === formData.provider && c.has_api_key) && (
                  <Badge variant="outline" className="ml-2">
                    Key already configured
                  </Badge>
                )}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder={configs.find(c => c.provider === formData.provider && c.has_api_key) 
                    ? 'Leave empty to keep existing key'
                    : 'Enter API key'}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestKey}
                  disabled={!formData.api_key || testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test
                </Button>
              </div>
              {testResult && (
                <Alert variant={testResult.valid ? 'default' : 'destructive'} className="mt-2">
                  {testResult.valid ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-muted-foreground">
                Enter a new API key to update. Leave empty to keep the existing key.
              </p>
            </div>

            {/* Organization ID (OpenAI only) */}
            {formData.provider === 'openai' && (
              <div className="space-y-2">
                <Label htmlFor="organization_id">Organization ID (Optional)</Label>
                <Input
                  id="organization_id"
                  type="text"
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  placeholder="org-..."
                />
                <p className="text-sm text-muted-foreground">
                  Optional OpenAI organization ID for billing purposes
                </p>
              </div>
            )}

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="default_model">Default Model</Label>
              <Select
                value={formData.default_model}
                onValueChange={(value) => setFormData({ ...formData, default_model: value })}
              >
                <SelectTrigger id="default_model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(formData.available_models && formData.available_models.length > 0
                    ? formData.available_models
                    : AVAILABLE_MODELS[formData.provider] || []
                  ).map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature: {formData.default_temperature}
                </Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.default_temperature}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    default_temperature: safeParseNumeric(e.target.value, formData.default_temperature, parseFloat)
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_tokens">Max Tokens</Label>
                <Input
                  id="max_tokens"
                  type="number"
                  min="1"
                  max="256000"
                  value={formData.default_max_tokens}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    default_max_tokens: safeParseNumeric(e.target.value, formData.default_max_tokens, parseInt)
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="top_p">Top P: {formData.default_top_p}</Label>
                <Input
                  id="top_p"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.default_top_p}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    default_top_p: safeParseNumeric(e.target.value, formData.default_top_p, parseFloat)
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency_penalty">
                  Frequency Penalty: {formData.default_frequency_penalty}
                </Label>
                <Input
                  id="frequency_penalty"
                  type="number"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={formData.default_frequency_penalty}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    default_frequency_penalty: safeParseNumeric(e.target.value, formData.default_frequency_penalty, parseFloat)
                  })}
                />
              </div>
            </div>

            {/* Status Switches */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this configuration for use
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  aria-label="Enable this configuration"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_default">Set as Default</Label>
                  <p className="text-sm text-muted-foreground">
                    Use this as the default LLM configuration for all agents
                  </p>
                </div>
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  aria-label="Set as default configuration"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

