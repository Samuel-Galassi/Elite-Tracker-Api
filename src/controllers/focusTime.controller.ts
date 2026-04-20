import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'America/Sao_Paulo';

import type { Request, Response } from 'express';
import { z } from 'zod';
import { focusTimeModel } from '../models/focus-time.model.js';
import { buildValidationErrorMessage } from '../utils/build-validation-error-message.utils.js';

export class FocusTimeController {
  store = async (req: Request, res: Response) => {
    const schema = z.object({
      timeFrom: z.string(),
      timeTo: z.string(),
    });

    const focusTime = schema.safeParse(req.body);

    if (!focusTime.success) {
      const errors = buildValidationErrorMessage(focusTime.error.issues);
      return res.status(422).json({ message: errors });
    }

    // ✅ sempre parsear como UTC
    const timeFrom = dayjs.utc(focusTime.data.timeFrom);
    const timeTo = dayjs.utc(focusTime.data.timeTo);

    if (!timeFrom.isValid() || !timeTo.isValid()) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    if (timeTo.isBefore(timeFrom)) {
      return res
        .status(400)
        .json({ message: 'timeTo cannot be before timeFrom.' });
    }

    const createdFocusTime = await focusTimeModel.create({
      timeFrom: timeFrom.toDate(), // UTC
      timeTo: timeTo.toDate(), // UTC
      userId: req.user.id,
    });

    return res.status(201).json(createdFocusTime);
  };

  index = async (req: Request, res: Response) => {
    const schema = z.object({
      date: z.string(),
    });

    const validated = schema.safeParse(req.query);

    if (!validated.success) {
      const errors = buildValidationErrorMessage(validated.error.issues);
      return res.status(422).json({ message: errors });
    }

    // ✅ interpreta data no timezone do usuário e converte pra UTC
    const startDate = dayjs.tz(validated.data.date, TZ).startOf('day').utc();
    const endDate = dayjs.tz(validated.data.date, TZ).endOf('day').utc();

    const focusTimes = await focusTimeModel
      .find({
        timeFrom: {
          $gte: startDate.toDate(),
          $lte: endDate.toDate(),
        },
        userId: req.user.id,
      })
      .sort({ timeFrom: 1 });

    return res.status(200).json(focusTimes ?? []);
  };

  metricsByMonth = async (req: Request, res: Response) => {
    const schema = z.object({
      date: z.string(),
    });

    const validated = schema.safeParse(req.query);

    if (!validated.success) {
      const errors = buildValidationErrorMessage(validated.error.issues);
      return res.status(422).json({ message: errors });
    }

    const startDate = dayjs.tz(validated.data.date, TZ).startOf('month').utc();
    const endDate = dayjs.tz(validated.data.date, TZ).endOf('month').utc();

    const focusTimeMetrics = await focusTimeModel.aggregate([
      {
        $match: {
          timeFrom: {
            $gte: startDate.toDate(),
            $lte: endDate.toDate(),
          },
          userId: req.user.id,
        },
      },
      {
        // ✅ aplica timezone no Mongo
        $project: {
          year: { $year: { date: '$timeFrom', timezone: TZ } },
          month: { $month: { date: '$timeFrom', timezone: TZ } },
          day: { $dayOfMonth: { date: '$timeFrom', timezone: TZ } },
        },
      },
      {
        $group: {
          _id: { year: '$year', month: '$month', day: '$day' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
      },
    ]);

    return res.status(200).json(focusTimeMetrics);
  };
}
