package id.denka.pos

import android.os.Bundle
import android.widget.Toast
import androidx.activity.OnBackPressedCallback

class MainActivity : TauriActivity() {
  private var lastBackPress = 0L

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Tekan kembali dua kali untuk keluar (bukan langsung keluar).
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
      override fun handleOnBackPressed() {
        val now = System.currentTimeMillis()
        if (now - lastBackPress < 2000) {
          finish()
        } else {
          lastBackPress = now
          Toast.makeText(
            this@MainActivity,
            "Tekan tombol kembali sekali lagi untuk keluar",
            Toast.LENGTH_SHORT,
          ).show()
        }
      }
    })
  }
}
