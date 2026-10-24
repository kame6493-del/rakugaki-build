import UIKit
import Capacitor

// らくがき運動会の画面。Capacitor の画面に、指で描いて走らせるゲームのための振る舞いを足す。
// - 描く枠は画面の下の方まであるので、下の端のスワイプは描く指を先に受ける(線の途中でホームに戻らない)
// - 描いている間に画面がばねのように揺れたり、つまんで拡大されたりしないようにする
// - 絵を長押ししても画像のプレビューが出ないようにする
// - スタートの号砲・転んだ時・ゴールの手ごたえを本体の振動(Taptic Engine)で返す(RaceFeelPlugin)
class RakugakiViewController: CAPBridgeViewController {
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .bottom }

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RaceFeelPlugin())
    }

    override open func viewDidLoad() {
        super.viewDidLoad()
        // タイトルの空の色。読み込みの一瞬に白が見えないように
        view.backgroundColor = UIColor(red: 127.0 / 255.0, green: 211.0 / 255.0, blue: 251.0 / 255.0, alpha: 1.0)
        if let scroll = webView?.scrollView {
            scroll.bounces = false
            scroll.pinchGestureRecognizer?.isEnabled = false
        }
        webView?.allowsLinkPreview = false
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
    }
}

// レースの手ごたえ。ゲームの中から RaceFeel.feel({ kind }) で呼ぶ(app_ios_feel.js)。
// start=号砲 / bump=自分の子が転んだ・ぶつかった / item=おにぎり / win=表彰台でゴール / lose=4位より下でゴール / stroke=線を描き始めた
@objc(RaceFeelPlugin)
public class RaceFeelPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RaceFeelPlugin"
    public let jsName = "RaceFeel"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "feel", returnType: CAPPluginReturnPromise)
    ]

    @objc func feel(_ call: CAPPluginCall) {
        let kind = call.getString("kind") ?? ""
        DispatchQueue.main.async {
            switch kind {
            case "start":
                UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            case "bump":
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            case "item":
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            case "win":
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            case "lose":
                UINotificationFeedbackGenerator().notificationOccurred(.warning)
            case "stroke":
                UISelectionFeedbackGenerator().selectionChanged()
            default:
                UIImpactFeedbackGenerator(style: .soft).impactOccurred()
            }
        }
        call.resolve()
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Main.storyboard が RakugakiViewController の窓を用意する。無い時だけここで作る
        if window == nil {
            window = UIWindow(windowScene: windowScene)
            window?.rootViewController = RakugakiViewController()
            window?.makeKeyAndVisible()
        }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
