/**
 * Chat Page
 *
 * Main page for the ChatKit chat interface.
 * Users can interact with the JetVision AI Assistant here.
 */

import { ChatKitInterface } from '@/components/chatkit-interface'

export const metadata = {
  title: 'Chat | JetVision Agent',
  description: 'Chat with the JetVision AI Assistant powered by OpenAI ChatKit',
}

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">
          JetVision AI Assistant
        </h1>
        <p className="text-lg text-gray-600">
          Book your private jet with AI-powered assistance
        </p>
      </div>

      <ChatKitInterface
        className="h-[700px] w-full max-w-2xl rounded-2xl shadow-2xl"
        theme={{
          primaryColor: '#0066cc',
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          borderRadius: '16px',
        }}
      />

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Powered by OpenAI ChatKit and GPT-5</p>
      </div>
    </div>
  )
}
