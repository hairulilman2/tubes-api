import { defineConfig } from '@adonisjs/core/app'

export default defineConfig({
  /*
  |--------------------------------------------------------------------------
  | Zoom API Configuration
  |--------------------------------------------------------------------------
  |
  | Configuration for Zoom API integration
  |
  */
  zoom: {
    apiKey: process.env.ZOOM_API_KEY || 'your_zoom_api_key',
    apiSecret: process.env.ZOOM_API_SECRET || 'your_zoom_api_secret',
    baseUrl: 'https://api.zoom.us/v2',
    webhookSecret: process.env.ZOOM_WEBHOOK_SECRET || 'your_webhook_secret',
    
    // Default meeting settings
    defaultSettings: {
      host_video: true,
      participant_video: true,
      join_before_host: false,
      mute_upon_entry: true,
      waiting_room: false,
      auto_recording: 'cloud', // 'local', 'cloud', or 'none'
    }
  }
})