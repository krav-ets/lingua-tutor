import type { Context } from '#root/bot/context.js';
import { Menu } from '@grammyjs/menu';

export const timePickerMenu = new Menu<Context>('time-picker-menu')
  .dynamic((ctx, range) => {
    const { hour, minute } = ctx.session.timePicker || {};
    const timeString = `${String(hour ?? '00').padStart(2, '0')}:${String(minute ?? '00').padStart(2, '0')}`;

    range.text(`${ctx.t('current-time')}: ${timeString}`);
    range.row();

    range.submenu(ctx.t('select-hour'), 'time-picker-hours');
    range.submenu(ctx.t('select-minute'), 'time-picker-minutes');
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

timePickerMenu.register(hoursMenu);
timePickerMenu.register(minutesMenu);
