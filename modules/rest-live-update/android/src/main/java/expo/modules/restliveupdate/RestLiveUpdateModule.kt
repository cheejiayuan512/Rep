package expo.modules.restliveupdate

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import android.os.Bundle
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val CHANNEL_ID = "rest-live"
private const val NOTIFICATION_ID = 4120
// Notification.EXTRA_REQUEST_PROMOTED_ONGOING, written out so older compile SDKs still build.
private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"

/**
 * The rest countdown as an ongoing notification. Android ticks the countdown
 * itself, and on Android 16 the notification asks to be promoted to a Live Update:
 * a status bar chip plus a pinned card on the lock screen and at the top of the shade.
 */
class RestLiveUpdateModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No React context")

  override fun definition() = ModuleDefinition {
    Name("RestLiveUpdate")

    Function("show") { title: String, body: String, endsAt: Double ->
      show(title, body, endsAt.toLong())
    }

    Function("end") {
      manager().cancel(NOTIFICATION_ID)
    }
  }

  private fun manager(): NotificationManager =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun show(title: String, body: String, endsAt: Long) {
    // Channels and timeouts start at Android 8. Android 7 keeps only the "Rest is over" alert.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val remaining = endsAt - System.currentTimeMillis()
    val manager = manager()
    if (remaining <= 0) {
      manager.cancel(NOTIFICATION_ID)
      return
    }
    if (manager.getNotificationChannel(CHANNEL_ID) == null) {
      // Silent: the "Rest is over" alert from expo-notifications makes the sound.
      // Live Updates refuse IMPORTANCE_MIN channels, so this stays at DEFAULT.
      val channel = NotificationChannel(CHANNEL_ID, "Rest countdown", NotificationManager.IMPORTANCE_DEFAULT).apply {
        description = "The running rest timer between sets."
        setSound(null, null)
        enableVibration(false)
        setShowBadge(false)
      }
      manager.createNotificationChannel(channel)
    }

    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
    val open = launch?.let {
      PendingIntent.getActivity(context, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    val builder = Notification.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(title)
      .setContentText(body)
      .setCategory(Notification.CATEGORY_STOPWATCH)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(true)
      .setWhen(endsAt)
      .setUsesChronometer(true)
      .setChronometerCountDown(true)
      .setTimeoutAfter(remaining)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .addExtras(Bundle().apply { putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true) })
    if (open != null) {
      builder.setContentIntent(open)
    }

    manager.notify(NOTIFICATION_ID, builder.build())
  }
}
