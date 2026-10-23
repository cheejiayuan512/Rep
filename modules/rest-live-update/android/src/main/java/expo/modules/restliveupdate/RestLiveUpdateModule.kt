package expo.modules.restliveupdate

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.lang.ref.WeakReference

private const val CHANNEL_ID = "rest-live"
private const val NOTIFICATION_ID = 4120
private const val ACTION_COMPLETE_SET = "expo.modules.restliveupdate.COMPLETE_SET"
// Notification.EXTRA_REQUEST_PROMOTED_ONGOING, written out so older compile SDKs still build.
private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"

class LiveUpdateOptions : Record {
  @Field var restTitle: String = "Rest"
  @Field var idleTitle: String = "Workout"
  @Field var body: String = ""
  @Field var workoutStartedAt: Double = 0.0
  @Field var restEndsAt: Double = 0.0
  @Field var actionLabel: String = ""
}

/**
 * The open workout as an ongoing notification. Android ticks the timer itself:
 * a countdown while resting, then time since the workout started. On Android 16
 * the notification asks to be promoted to a Live Update: a status bar chip plus
 * a pinned card on the lock screen and at the top of the shade.
 */
class RestLiveUpdateModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  private val handler = Handler(Looper.getMainLooper())
  private var lastOptions: LiveUpdateOptions? = null
  private val restEnded = Runnable { lastOptions?.let { render(it) } }

  override fun definition() = ModuleDefinition {
    Name("RestLiveUpdate")

    Events("onAction")

    OnCreate {
      current = WeakReference(this@RestLiveUpdateModule)
    }

    OnDestroy {
      handler.removeCallbacks(restEnded)
    }

    Function("show") { options: LiveUpdateOptions ->
      lastOptions = options
      render(options)
    }

    Function("end") {
      lastOptions = null
      handler.removeCallbacks(restEnded)
      manager().cancel(NOTIFICATION_ID)
    }
  }

  private fun manager(): NotificationManager =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun render(options: LiveUpdateOptions) {
    handler.removeCallbacks(restEnded)
    // Channels start at Android 8. Android 7 keeps only the "Rest is over" alert.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = manager()
    // Silent: the "Rest is over" alert from expo-notifications makes the sound.
    // Live Updates refuse IMPORTANCE_MIN channels, so this stays at DEFAULT.
    // Created every time so the name follows the app; Android keeps the user's settings.
    val channel = NotificationChannel(CHANNEL_ID, "Workout in progress", NotificationManager.IMPORTANCE_DEFAULT).apply {
      description = "The open workout: next set, rest countdown, and Done."
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)

    val now = System.currentTimeMillis()
    val restEndsAt = options.restEndsAt.toLong()
    val resting = restEndsAt > now

    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val open = launch?.let {
      PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    val builder = Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(if (resting) options.restTitle else options.idleTitle)
      .setContentText(options.body)
      .setCategory(Notification.CATEGORY_STOPWATCH)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setWhen(if (resting) restEndsAt else options.workoutStartedAt.toLong())
      .setUsesChronometer(true)
      .setChronometerCountDown(resting)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
    if (open != null) {
      builder.setContentIntent(open)
    }
    if (options.actionLabel.isNotEmpty()) {
      val intent = Intent(context, WorkoutActionReceiver::class.java).setAction(ACTION_COMPLETE_SET)
      val pending = PendingIntent.getBroadcast(context, 1, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
      val icon = Icon.createWithResource(context, android.R.drawable.checkbox_on_background)
      builder.addAction(Notification.Action.Builder(icon, options.actionLabel, pending).build())
    }

    manager.notify(NOTIFICATION_ID, builder.build())
    if (resting) {
      handler.postDelayed(restEnded, restEndsAt - now)
    }
  }

  internal fun emitCompleteSet() {
    sendEvent("onAction", mapOf("action" to "complete-set"))
  }

  companion object {
    internal var current: WeakReference<RestLiveUpdateModule>? = null
  }
}

/**
 * Forwards "Done set" to JavaScript. If the app's JavaScript is not running
 * (the process was killed), it opens the app instead so the tap is not lost silently.
 */
class WorkoutActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_COMPLETE_SET) {
      return
    }
    val module = RestLiveUpdateModule.current?.get()
    if (module != null) {
      module.emitCompleteSet()
      return
    }
    context.packageManager.getLaunchIntentForPackage(context.packageName)?.let {
      it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(it)
      } catch (error: Exception) {
        // Background activity starts are blocked; the notification's tap still opens the app.
      }
    }
  }
}
