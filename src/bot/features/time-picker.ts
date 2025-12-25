import type { Context } from '#root/bot/context.js';
import { Menu } from '@grammyjs/menu';

const DEFAULT_TIMEZONE = '+03:00';

// List of common UTC offsets
const TIMEZONE_OFFSETS = [
  '-12:00',
  '-11:00',
  '-10:00',
  '-09:00',
  '-08:00',
  '-07:00',
  '-06:00',
  '-05:00',
  '-04:00',
  '-03:00',
  '-02:00',
  '-01:00',
  '+00:00',
  '+01:00',
  '+02:00',
  '+03:00',
  '+04:00',
  '+05:00',
  '+06:00',
  '+07:00',
  '+08:00',
  '+09:00',
  '+10:00',
  '+11:00',
  '+12:00',
];

export const timePickerMenu = new Menu<Context>('time-picker-menu')
  .dynamic((ctx, range) => {
    const { hour, minute, timezone } = ctx.session.timePicker || {};
    const timeString = `${String(hour ?? '00').padStart(2, '0')}:${String(minute ?? '00').padStart(2, '0')}`;
    const tzDisplay = timezone || DEFAULT_TIMEZONE;

    range.text(`${ctx.t('current-time')}: ${timeString} (UTC${tzDisplay})`);
    range.row();

    range.submenu(ctx.t('select-hour'), 'time-picker-hours');
    range.submenu(ctx.t('select-minute'), 'time-picker-minutes');
    range.row();

    range.submenu(ctx.t('select-timezone'), 'time-picker-timezone');
    range.row();

    range.text(ctx.t('done'), async (ctx) => {
      // The caller should handle the result by checking ctx.session.timePicker
      // This button just closes the picker or goes back
      await ctx.menu.back();
    });
  });

const hoursMenu = new Menu<Context>('time-picker-hours')
  .dynamic((ctx, range) => {
    for (let h = 0; h < 24; h++) {
      range.text(String(h).padStart(2, '0'), async (ctx) => {
        ctx.session.timePicker = { ...ctx.session.timePicker, hour: h };
        await ctx.menu.back();
      });
      if ((h + 1) % 6 === 0)
        range.row();
    }
    range.row();
    range.back(ctx.t('back'));
  });

const minutesMenu = new Menu<Context>('time-picker-minutes')
  .dynamic((ctx, range) => {
    for (let m = 0; m < 60; m += 5) {
      range.text(String(m).padStart(2, '0'), async (ctx) => {
        ctx.session.timePicker = { ...ctx.session.timePicker, minute: m };
        await ctx.menu.back();
      });
      if ((m / 5 + 1) % 4 === 0)
        range.row();
    }
    range.row();
    range.back(ctx.t('back'));
  });

const timezoneMenu = new Menu<Context>('time-picker-timezone')
  .dynamic((ctx, range) => {
    const currentTz = ctx.session.timePicker?.timezone || DEFAULT_TIMEZONE;

    for (const [idx, tz] of TIMEZONE_OFFSETS.entries()) {
      const isActive = tz === currentTz;
      const label = `${isActive ? '✅ ' : ''}${tz}`;

      range.text(label, async (ctx) => {
        ctx.session.timePicker = { ...ctx.session.timePicker, timezone: tz };
        await ctx.menu.back();
      });

      // 5 buttons per row
      if ((idx + 1) % 5 === 0)
        range.row();
    }
    range.row();
    range.back(ctx.t('back'));
  });

timePickerMenu.register(hoursMenu);
timePickerMenu.register(minutesMenu);
timePickerMenu.register(timezoneMenu);

export { DEFAULT_TIMEZONE };
