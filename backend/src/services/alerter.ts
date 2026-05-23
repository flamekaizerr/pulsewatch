import type { Monitor, MonitorStatus } from '@shared/types';

export const sendStatusAlert = async (monitor: Monitor, previousStatus: MonitorStatus, newStatus: MonitorStatus) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const timestamp = new Date().toISOString();

  // Create Discord payload structure
  const color = newStatus === 'UP' ? 3066993 : 15158332; // Green for UP, Red for DOWN/DEGRADED
  const statusEmoji = newStatus === 'UP' ? '🟢' : '🔴';
  
  const content = `${statusEmoji} **PulseWatch Alert:** Monitor **${monitor.name}** status changed from **${previousStatus}** to **${newStatus}**.`;
  
  const payload = {
    embeds: [
      {
        title: `${statusEmoji} Monitor Status Changed`,
        color,
        fields: [
          { name: 'Name', value: monitor.name, inline: true },
          { name: 'URL', value: monitor.url, inline: true },
          { name: 'Old Status', value: previousStatus, inline: true },
          { name: 'New Status', value: newStatus, inline: true },
          { name: 'Time', value: timestamp, inline: false },
        ],
        footer: { text: 'PulseWatch Real-time Uptime Monitor' },
      },
    ],
  };

  if (!webhookUrl) {
    console.log(`[ALERT CONSOLE LOG] Status change for monitor "${monitor.name}" (${monitor.url}): ${previousStatus} -> ${newStatus}. (Discord Webhook missing)`);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Failed to send Discord alert: ${response.statusText}`);
    }
  } catch (err) {
    console.error('Error sending Discord alert:', err);
  }
};
